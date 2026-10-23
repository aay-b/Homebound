import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '@/config/prisma.js'
import { Prisma } from '@/generated/prisma/client.js'
import { supabase, supabaseAuth } from '@/config/supabase.js'

export const authRouter = Router()

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters long'),
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
})

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

function inferMessagingRole(name: string) {
  // This is a temporary onboarding rule until registration exposes an explicit role choice.
  return /\b(shelter|rescue)\b/i.test(name) ? 'shelter_staff' : 'user'
}

authRouter.post('/register', async (request, response) => {
  const result = registerSchema.safeParse(request.body)
  if (!result.success) {
    return response.status(400).json({
      message: 'Invalid registration information',
      errors: result.error.flatten().fieldErrors,
    })
  }

  const { name, email, password } = result.data
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    user_metadata: { name },
    email_confirm: true,
  })

  if (error) {
    if (error.message.toLowerCase().includes('already')) {
      return response.status(409).json({ message: 'An account with this email already exists' })
    }

    console.error('Supabase registration error:', error)
    return response.status(500).json({ message: 'Unable to create account' })
  }

  if (!data.user) {
    return response.status(500).json({ message: 'Unable to create account' })
  }

  try {
    const role = inferMessagingRole(name)
    // A new Auth identity gets its own application user, even when display names are identical.
    const messagingUser = await prisma.user.create({
      data: { authUserId: data.user.id, name, email: data.user.email ?? email, role },
    })

    return response.status(201).json({
      message: 'Account created successfully',
      user: {
        id: data.user.id,
        messagingUserId: messagingUser.id.toString(),
        name,
        email: data.user.email,
        role: messagingUser.role,
      },
    })
  } catch (databaseError) {
    // Do not leave a usable Auth account when its linked application user was not created.
    let rollbackFailed = false
    try {
      const { error: rollbackError } = await supabase.auth.admin.deleteUser(data.user.id)
      rollbackFailed = Boolean(rollbackError)
    } catch {
      rollbackFailed = true
    }
    if (rollbackFailed) {
      console.error('Unable to roll back an incomplete account registration.')
      return response.status(500).json({ message: 'Unable to create account. Please contact support before trying again.' })
    }
    if (databaseError instanceof Prisma.PrismaClientKnownRequestError && databaseError.code === 'P2002') {
      return response.status(409).json({ message: 'An account with this email already exists' })
    }
    console.error('Account profile creation failed.', {
      name: databaseError instanceof Error ? databaseError.name : 'UnknownError',
      code: databaseError instanceof Prisma.PrismaClientKnownRequestError ? databaseError.code : undefined,
    })

    return response.status(500).json({ message: 'Unable to create account profile' })
  }
})

authRouter.post('/login', async (request, response) => {
  const result = loginSchema.safeParse(request.body)
  if (!result.success) {
    return response.status(400).json({
      message: 'Invalid login information',
      errors: result.error.flatten().fieldErrors,
    })
  }

  const { email, password } = result.data
  const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password })

  if (error) {
    return response.status(401).json({ message: 'Incorrect email or password' })
  }

  return response.status(200).json({
    message: 'Login successful',
    user: {
      id: data.user.id,
      email: data.user.email,
      name: typeof data.user.user_metadata.name === 'string' ? data.user.user_metadata.name : '',
    },
    session: data.session,
  })
})

import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '@/config/prisma.js'
import { supabase, supabaseAuth } from '@/config/supabase.js'

export const authRouter = Router()

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  email: z.string().email('Please enter a valid email address'),
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
    // Display names are not unique, so resolve the matching messaging user before creating one.
    const existingMessagingUser = await prisma.user.findFirst({ where: { name } })
    const messagingUser = existingMessagingUser
      ? await prisma.user.update({
          where: { id: existingMessagingUser.id },
          data: { email, role },
        })
      : await prisma.user.create({ data: { name, email, role } })

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
    // Do not leave a usable Auth account when the linked messaging row was not created.
    await supabase.auth.admin.deleteUser(data.user.id)
    console.error('Messaging user creation error:', databaseError)

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

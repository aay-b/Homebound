import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '@/config/supabase.js'

export const authRouter = Router();

const registerSchema = z.object({
    name: z.string().min(2, 'Name must be atleast 2 characters long'),
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
});

authRouter.post('/register', async (request, response) => {
    const result = registerSchema.safeParse(request.body);
    if(!result.success) {
        return response.status(400).json({ message: 'Invalid registration information', 
            errors: result.error.flatten().fieldErrors });
    }
    const { name, email, password } = result.data

    const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        user_metadata: {
            name,
        },
        email_confirm: true,
    })

    if (error) {
        if (error.message.toLowerCase().includes('already')) {
            return response.status(409).json({
                message: 'An account with this email already exists',
            })
        }

        console.error('Supabase registration error:', error)

        return response.status(500).json({
            message: 'Unable to create account',
        })
    }

    return response.status(201).json({
        message: 'Account created successfully',
        user: {
            id: data.user.id,
            name,
            email: data.user.email,
        },
    })
});
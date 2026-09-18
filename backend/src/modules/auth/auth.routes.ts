import { Router } from 'express';
import { z } from 'zod';

export const authRouter = Router();

const registerSchema = z.object({
    name: z.string().min(2, 'Name must be atleast 2 characters long'),
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
});

authRouter.post('/register', (request, response) => {
    const result = registerSchema.safeParse(request.body);
    if(!result.success) {
        return response.status(400).json({ message: 'Invalid registration information', 
            errors: result.error.flatten().fieldErrors });
    }
    const { name, email } = result.data;
    return response.status(201).json({ message: 'Registration data is valid',
        user: { name, email }
     });
});
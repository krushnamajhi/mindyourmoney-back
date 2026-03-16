import {z} from 'zod';

export const registerUserSchema = z.object({
    firstName : z.string({ error : "Invalid First Name"}).trim().min(1, { message: "First Name cannot be empty" }),
    lastName : z.string({ error : "Invalid Last Name"}).trim().min(1, { message: "Last Name cannot be empty" }),
    email : z.email({error : "Invalid Email"}),
    password: z.string().min(8, {error : "password too short. it should be atleast 8 characters"})
})

export const loginSchema = z.object({
  email: z.email({ message: "Invalid email address" }),
  password: z.string().min(8, { message: "Password cannot be empty" })
});

export const updaterUserSchema = z.object({
    firstName : z.string({ error : "Invalid First Name"}).trim(),
    lastName : z.string({ error : "Invalid Last Name"}).trim(),
    email : z.email({error : "Invalid Email"}),
})
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { requestContext } from '../utils/apiUtils';

export interface AuthRequest extends Request {
    user?: {
        id: number;
        email: string;
    };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        // Get token from header or cookie
        console.log(req.headers)
        const authHeader = req.headers.authorization;
        let token: string | undefined;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        } else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        if (!token) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }

        // Verify token
        const decoded = jwt.verify(token, (process.env.JWT_SECRET as string) || 'secret') as { id: number, email: string };
        const context = {
            user: decoded
        }
        requestContext.run(context, () => {
            req.user = decoded;
            next();
        })
    } catch (error) {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
};

import { Router } from "express";
import { UserRoutes } from "./user.routes";

const userRoutes = Router();
const user = "user";
userRoutes.use(`/${user}/`, UserRoutes());

export { userRoutes };

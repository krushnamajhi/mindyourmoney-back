import express from 'express';
import { GroupController } from '../controllers/group.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { validate } from '../../../middlewares/validate-middlerware';
import { GroupMemberUpdateSchema, GroupSchema, UpdateGroupSchema } from '../validators/group.validator';

export function GroupRoutes() {
    const groupController = new GroupController();
    const router = express.Router();

    router.get('/list', groupController.list);
    router.get('/:id', groupController.getById);
    router.post('/create', validate(GroupSchema), groupController.create);
    router.put('/:id', validate(UpdateGroupSchema), groupController.update);
    router.delete('/:id', groupController.delete);
    router.put('/add-member/:id', validate(GroupMemberUpdateSchema), groupController.addMember)
    router.put('/remove-member/:id', validate(GroupMemberUpdateSchema), groupController.removeMember)
    return router;
}
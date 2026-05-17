import { NextFunction, RequestHandler } from "express";
import { GroupDTO } from "../dto/group.dto";
import { GroupService } from "../services/group.service";
import { APIError } from "../../../lib/custom-errors";
import { getLoggedInUserId } from "../../../utils/apiUtils";


export class GroupController {

    private groupService: GroupService
    constructor() {
        this.groupService = new GroupService();
    }

    create: RequestHandler = async (req, res, next: NextFunction) => {
        const groupDTO: GroupDTO = req.body;
        const userId = getLoggedInUserId(req);
        try {
            console.log(req.body, groupDTO)
            const group = await this.groupService.create(groupDTO, userId);
            res.status(201).json(group);
        } catch (error: any) {
            next(error)
        }
    }

    list: RequestHandler = async (req, res, next: NextFunction) => {
        try {
            const groups = await this.groupService.getAll();
            const _gs = [];
            for (const group of groups) {
                const _g: any = {}
                Object.assign(_g, group);
                _g.groupMembers = group.groupMembers.map(m => m.user.userInfo)
                _gs.push(_g);
            }
            res.json(_gs);
        } catch (error: any) {
            next(error)
        }
    }

    getById: RequestHandler = async (req, res, next: NextFunction) => {
        const { id } = req.params;
        try {
            const group = await this.groupService.getById(Number(id));
            if (!group)
                throw new APIError("Group with given Id not found");
            const _g: any = {}
            console.log(group)
            Object.assign(_g, group);
            _g.groupMembers = group.groupMembers.map(m => {
                const user = m.user.userInfo
                return { ...m, ["user"]: user }
            })

            res.json(_g);
        } catch (error: any) {
            next(error)
        }
    }

    getMembersByGroupId: RequestHandler = async (req, res, next: NextFunction) => {
        const { id } = req.params;
        try {
            const members = await this.groupService.getMembersByGroupId(Number(id));
            res.json(members);
        } catch (error: any) {
            next(error)
        }
    }

    delete: RequestHandler = async (req, res, next: NextFunction) => {
        const { id } = req.params;
        try {
            const success = await this.groupService.delete(Number(id));
            res.json({ success });
        } catch (error: any) {
            next(error)
        }
    }

    update: RequestHandler = async (req, res, next: NextFunction) => {
        const { id } = req.params;
        const groupDTO: GroupDTO = req.body;
        try {
            const group = await this.groupService.update(Number(id), groupDTO);
            res.json({ group });
        } catch (error: any) {
            next(error)
        }
    }

    addMember: RequestHandler = async (req, res, next: NextFunction) => {
        const groupDTO: Pick<GroupDTO, "groupMemberIds"> = req.body;
        const { id: groupId } = req.params;
        try {
            const group = await this.groupService.addMember(groupDTO, Number(groupId));
            res.status(201).json(group);
        } catch (error: any) {
            next(error)
        }
    }

    removeMember: RequestHandler = async (req, res, next: NextFunction) => {
        console.log("hello controller")
        const groupDTO: Pick<GroupDTO, "groupMemberIds"> = req.body;
        const { id: groupId } = req.params;
        try {
            const success = await this.groupService.removeMember(groupDTO, Number(groupId));
            res.status(201).json({ success });
        } catch (error: any) {
            next(error)
        }
    }
}

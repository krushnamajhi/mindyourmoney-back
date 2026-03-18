export class GroupMemberUserDTO {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    fullName: string;
}

export class GroupMemberDTO {
    groupId: number;
    userId: number;
    isActive: boolean;
    user: GroupMemberUserDTO;
}

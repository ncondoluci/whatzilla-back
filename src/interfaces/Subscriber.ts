export interface ISubscriber {
    id?: number;
    list_id: number;
    first_name: string;
    last_name: string;
    email: string;
    status: 'unsuscribed' | 'confirmed' | 'blacklisted';
    createdAt?: Date;
    updatedAt?: Date;
}

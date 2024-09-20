export interface ICampaign {
    id?: number;
    list_id: number;
    name: string;
    status: string;
    sent_at?: Date; 
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ICampaignReport {
    id?: number;
    campaign_id: number;
    status: 'cancelled' | 'stopped' | 'sent' | 'pending';
    sent_porcent: number;
    run_at: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

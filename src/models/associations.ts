import User from './User';
import List from './List';
import Campaign from './Campaign';
import Subscriber from './Subscriber';
import CampaignReport from './CampaignReport';

User.hasMany(Campaign, { foreignKey: 'user_id' });
Campaign.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(List, { foreignKey: 'user_id' });
List.belongsTo(User, { foreignKey: 'user_id' });

List.hasMany(Subscriber, { foreignKey: 'list_id' });
Subscriber.belongsTo(List, { foreignKey: 'list_id' });

List.hasMany(Campaign, { foreignKey: 'list_id' });
Campaign.belongsTo(List, { foreignKey: 'list_id' });

Campaign.hasMany(CampaignReport, { foreignKey: 'campaign_id' });
CampaignReport.belongsTo(Campaign, { foreignKey: 'campaign_id' });

export { User, List, Campaign, Subscriber, CampaignReport };

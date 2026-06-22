import { CampaignRuleAction } from "../../core/consts/enums/CampaignRuleAction";
import { FeedProviderIds } from "../../core/consts/enums/FeedProviderIds";
import { DBCampaignStatus } from "../../core/db/enums";
import { CampaignFilter2, DBCampaign2, Rule } from "../../core/db/types";

export function groupCampaignsByFeedProvider(
  campaigns: Array<DBCampaign2>
): Array<{ feedProviderId: FeedProviderIds; campaigns: Array<DBCampaign2> }> {
  const feedProviderIdToCampaigns = new Map<FeedProviderIds, Array<DBCampaign2>>();

  for (const campaign of campaigns) {
    const { feed_provider_id } = campaign;
    if (!feedProviderIdToCampaigns.has(feed_provider_id)) {
      feedProviderIdToCampaigns.set(feed_provider_id, []);
    }
    feedProviderIdToCampaigns.get(feed_provider_id)!.push(campaign);
  }

  return Array.from(feedProviderIdToCampaigns, ([feedProviderId, campaigns]) => ({
    feedProviderId,
    campaigns,
  }));
}

export function buildCampaignFilter2(event: Rule): CampaignFilter2 {
  return {
    trafficChannelId: event.targeting.trafficChannelId,
    businessManagerId: event.targeting.businessId?.length ? event.targeting.businessId : [],
    adAccountId: event.targeting.adAccountId?.length ? event.targeting.adAccountId : [],
    feedProviderId: event.targeting.feedProviderId,
    facebookUILanguage: event.targeting.facebookUILanguage?.length ? event.targeting.facebookUILanguage : [],
    countries: event.targeting.countries?.length ? event.targeting.countries : [],
    updatedSince: event.targeting.updatedSince,
    createdTime: event.targeting.createdTime?.trim() ? event.targeting.createdTime : "",
    topic: event.targeting.topic ? event.targeting.topic : [],
    campaignsIds: event.targeting.campaignsIds?.length ? event.targeting.campaignsIds : null,
    devicePlatforms: event.targeting.devicePlatforms?.length ? event.targeting.devicePlatforms : [],
    status: event.action.action === CampaignRuleAction.ACTIVATE ? DBCampaignStatus.PAUSED : DBCampaignStatus.ACTIVE,
    campaignsNames: event.targeting.campaignsNames?.trim() ? event.targeting.campaignsNames : null,
  };
}

export function filterCampaignsCandidatesByStatus(candidateCampaigns: Array<DBCampaign2>, targetAction: CampaignRuleAction) {
  const targetStatus = targetAction === CampaignRuleAction.ACTIVATE ? DBCampaignStatus.PAUSED : DBCampaignStatus.ACTIVE;
  return candidateCampaigns.filter((campaign) => campaign.status === targetStatus);
}

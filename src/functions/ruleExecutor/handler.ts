import { nodeEnvironment } from "../../core/consts/environmentVariables";
import { FeedProviderIds } from "../../core/consts/enums/FeedProviderIds";
import { CampaignFilter2, DBCampaign2, Rule, RuleActionTypes } from "../../core/db/types";
import { getCampaignsFromDB2 } from "../../core/db/queries";
import { buildCampaignFilter2, filterCampaignsCandidatesByStatus, groupCampaignsByFeedProvider } from "./ruleExecutor";
import { getFeedProvider } from "../../core/feedProviders/FeedProviders";
import { feedProvidersIdsToNames } from "../../core/consts/feedProvidersIdsToNames";
import { PuppeteerFeedProvider } from "../../core/feedProviders/PuppeteerFeedProvider";
import { FeedProvider } from "../../core/feedProviders/FeedProvider";

export const handler = async (event: Rule) => {
  console.info(`invoked ruleExecution in ${nodeEnvironment} env`);
  const rule: Rule = event;
  console.info(`Rule triggered by ${rule.creator}, action: ${JSON.stringify(rule.action)}, timezone: ${rule.timezone}`);
  const campaignFilter: CampaignFilter2 = buildCampaignFilter2(rule);
  let candidateCampaigns: Array<DBCampaign2> = await getCampaignsFromDB2(campaignFilter);
  console.info(`Found ${candidateCampaigns.length} amount of campaigns candidates`);
  console.log("CandidateCampaigns", candidateCampaigns);
  candidateCampaigns =
    rule.action.type === RuleActionTypes.STATUS
      ? filterCampaignsCandidatesByStatus(candidateCampaigns, rule.action.action)
      : candidateCampaigns;
  console.log("CandidateCampaigns", candidateCampaigns);
  const feedProvidersToCampaigns: Array<{
    feedProviderId: FeedProviderIds;
    campaigns: Array<DBCampaign2>;
  }> = groupCampaignsByFeedProvider(candidateCampaigns);
  for (const { feedProviderId, campaigns } of feedProvidersToCampaigns) {
    console.info(`Running on ${feedProvidersIdsToNames.get(feedProviderId)}`);
    const feedProvider: PuppeteerFeedProvider | FeedProvider = getFeedProvider(feedProviderId);
    await feedProvider.login();
    await feedProvider.changeCampaignsStatus(campaigns, event.action.action);
  }
};

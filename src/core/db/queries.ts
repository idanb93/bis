import { getPool } from "./db";
import { InternalBusinessId } from "../consts/enums/InternalBusinessId";
import {
  CampaignFilter,
  CampaignFilter2,
  DBAccount,
  DBCampaign,
  DBCampaign2,
} from "./types";
import { Pool } from "pg";

export async function getTrafficChannelsIds(): Promise<
  Array<InternalBusinessId>
> {
  try {
    const pool: Pool = await getPool();
    const result = await pool.query(`SELECT DISTINCT m.our_business_manager_id
                                        FROM metadata AS m
                                        JOIN traffic_sources AS ts
                                        ON ts.source_id = m.traffic_source_id
                                        WHERE ts.active = true
                                      `);
    const trafficChannelIds: Array<{
      our_business_manager_id: InternalBusinessId;
    }> = result.rows;
    return trafficChannelIds.map(
      (trafficChannel) => trafficChannel.our_business_manager_id,
    );
  } catch (err) {
    throw `error in getAllTrafficChannelsIds : ${err}`;
  }
}

export async function getAdAccountsFromDB(
  businessIds: Array<InternalBusinessId>,
  activeStatuses: Array<boolean>,
): Promise<Array<DBAccount>> {
  try {
    const pool: Pool = await getPool();
    let query = `
      SELECT aa.id, aa.name, aa.feed_provider_id
      FROM ad_accounts AS aa
      JOIN business_managers AS bm
      ON aa.business_manager_id = bm.id
      WHERE bm.internal_id = ANY($1)
    `;
    const params: Array<any> = [businessIds];
    if (activeStatuses.length > 0) {
      query += ` AND aa.active = ANY($2)`;
      params.push(activeStatuses);
    }
    const result = await pool.query(query, params);
    return result.rows.map((adAccount: DBAccount) => ({
      id: adAccount.id!,
      name: adAccount.name!,
      feedProviderId: adAccount.feed_provider_id!,
    }));
  } catch (err) {
    throw `error in getAdAccountsFromDB : ${err}`;
  }
}

export async function getCampaignsFromDB(
  filter: CampaignFilter,
): Promise<Array<DBCampaign>> {
  const pool = await getPool();

  let query: string = ``;
  if (filter.campaignsIds && filter.campaignsIds.length > 0) {
    query = `
      SELECT * FROM campaigns
      WHERE campaign_id = ANY($1)
      ORDER BY updated_time DESC;
    `;
    const result = await pool.query(query, [filter.campaignsIds]);
    return result.rows as Array<DBCampaign>;
  }

  const conditions: string[] = [
    `traffic_channel_id = $1`,
    `business_manager_id = $2`,
    `ad_account_id = $3`,
    `feed_provider_id = $4`,
    `updated_time >= $5`,
  ];
  const values: any[] = [
    filter.trafficChannelId,
    filter.businessManagerId,
    filter.adAccountId,
    filter.feedProviderId,
    new Date(filter.updatedSince),
  ];
  let i = 6;

  const addCondition = (field: any, clause: string) => {
    if (
      field !== undefined &&
      field !== null &&
      (!Array.isArray(field) || field.length > 0)
    ) {
      conditions.push(clause.replace("?", `$${i++}`));
      values.push(field);
    }
  };

  addCondition(filter.facebookUILanguage, `user_facebook_ui_language && ?`);
  addCondition(filter.countries, `countries = ?::text[]`);
  addCondition(filter.countryGroups, `country_groups && ?`);
  addCondition(filter.createdTime, `created_time >= ?`);
  addCondition(filter.topic, `topic = ?`);
  addCondition(filter.devicePlatforms, `device_platforms && ?`);
  addCondition(filter.minAge, `age_max >= ?`);
  addCondition(filter.maxAge, `age_min <= ?`);
  addCondition(filter.status, `status = ?`);

  query = `
    SELECT * FROM campaigns
    WHERE ${conditions.join(" AND ")}
    ORDER BY updated_time DESC;
  `;

  const result = await pool.query(query, values);
  return result.rows as Array<DBCampaign>;
}

export async function getCampaignsFromDB2(
  filter: CampaignFilter2,
): Promise<Array<DBCampaign2>> {
  const pool = await getPool();

  const SELECT_COLUMNS = `
    campaign_id,
    traffic_channel_id,
    business_manager_id,
    ad_account_id,
    feed_provider_id,
    domain,
    name,
    topic,
    term_group,
    media_buyer,
    status,
    countries,
    country_groups,
    device_platforms,
    publisher_platforms,
    user_facebook_ui_language,
    created_time,
    updated_time
  `;

  if (filter.campaignsIds?.length) {
    const byIdsSql = `
      SELECT ${SELECT_COLUMNS}
      FROM campaigns
      WHERE campaign_id = ANY($1::text[])
      ORDER BY updated_time DESC;
    `;
    const byIdsRes = await pool.query(byIdsSql, [filter.campaignsIds]);
    return byIdsRes.rows as Array<DBCampaign2>;
  }

  if (filter.campaignsNames?.trim()) {
    const names = filter.campaignsNames
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean);
    if (names.length) {
      const byNamesSql = `
        WITH wanted AS (
          SELECT name, ord
          FROM unnest($1::text[]) WITH ORDINALITY AS u(name, ord)
        )
        SELECT ${SELECT_COLUMNS}
        FROM wanted w
        JOIN campaigns c ON c.name = w.name
        ORDER BY w.ord, c.updated_time DESC;
      `;
      const byNamesRes = await pool.query(byNamesSql, [names]);
      return byNamesRes.rows as Array<DBCampaign2>;
    }
  }

  const conditions: string[] = [
    `traffic_channel_id = $1`,
    `business_manager_id = ANY($2::text[])`,
    `ad_account_id = ANY($3::text[])`,
    `feed_provider_id = $4`,
  ];
  const values: any[] = [
    filter.trafficChannelId,
    filter.businessManagerId,
    filter.adAccountId,
    filter.feedProviderId,
  ];
  let i = 5;

  const isoOrNull = (s?: string | null) =>
    s && !Number.isNaN(Date.parse(s)) ? new Date(s).toISOString() : null;

  const add = (field: unknown, clause: string, transform?: (v: any) => any) => {
    const present =
      field !== undefined &&
      field !== null &&
      (!Array.isArray(field) || field.length > 0);
    if (present) {
      conditions.push(clause.replace("?", `$${i}`));
      values.push(transform ? transform(field) : field);
      i += 1;
    }
  };

  add(isoOrNull(filter.updatedSince), `updated_time >= ?::timestamptz`);
  add(filter.facebookUILanguage, `user_facebook_ui_language && ?::text[]`);
  add(filter.countries, `countries = ?::text[]`); // exact ['GR']
  add(filter.countryGroups, `country_groups && ?::text[]`);
  add(isoOrNull(filter.createdTime ?? null), `created_time >= ?::timestamptz`);
  add(filter.topic, `topic = ?`);
  add(filter.devicePlatforms, `device_platforms && ?::text[]`);
  // no status filter unless explicitly requested

  const sql = `
    SELECT ${SELECT_COLUMNS}
    FROM campaigns
    WHERE ${conditions.join(" AND ")}
    ORDER BY updated_time DESC;
  `;

  const result = await pool.query(sql, values);
  return result.rows as Array<DBCampaign2>;
}

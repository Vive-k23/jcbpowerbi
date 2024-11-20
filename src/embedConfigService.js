const auth = require(__dirname + "/authentication.js");
const config = require(__dirname + "/../config/config.json");
const utils = require(__dirname + "/utils.js");

const PowerBiReportDetails = require(__dirname + "/../models/embedReportConfig.js");
const EmbedConfig = require(__dirname + "/../models/embedConfig.js");
const fetch = require('node-fetch');
const { Pool } = require('pg');

// Configure the Azure SQL database connection
const pool = new Pool({
    user: 'msaisandeep93',
    host: 'jcbpostgresql.postgres.database.azure.com',
    database: 'jcbdb',
    password: 'Sandeep2702',
    port: 5432,
    ssl: { rejectUnauthorized: false },
});

/**
 * Generate embed token and embed URLs for reports with user-specific restrictions.
 * @return Details like Embed URL, Access token, and Expiry.
 */
async function getEmbedInfo() {
    try {
        const embedParams = await getEmbedParamsForSingleReport(config.workspaceId, config.reportId);

        return {
            'accessToken': embedParams.embedToken.token,
            'embedUrl': embedParams.reportsDetail,
            'expiry': embedParams.embedToken.expiration,
            'status': 200
        };
    } catch (err) {
        return {
            'status': err.status,
            'error': `Error while retrieving report embed details\r\n${err.statusText}\r\nRequestId: \n${err.headers.get('requestid')}`
        };
    }
}

/**
 * Fetch the latest username from the Azure SQL database based on the timestamp.
 * @return {Promise<string>} The latest username (email).
 */
async function getLatestUsername() {
    try {
        const query = `
            SELECT username
            FROM logins
            ORDER BY login_time DESC
            LIMIT 1;
        `;

        const result = await pool.query(query);

        if (result.rows.length > 0) {
            return result.rows[0].username;
        } else {
            throw new Error("No login data found in the database.");
        }
    } catch (err) {
        console.error("Error fetching username from database:", err);
        throw new Error("Failed to fetch username.");
    }
}

/**
 * Get embed params for a single report in a single workspace with user-specific restrictions.
 * @param {string} workspaceId
 * @param {string} reportId
 * @param {string} additionalDatasetId - Optional Parameter
 * @return EmbedConfig object
 */
async function getEmbedParamsForSingleReport(workspaceId, reportId, additionalDatasetId) {
    const reportInGroupApi = `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/reports/${reportId}`;
    const headers = await getRequestHeader();

    const result = await fetch(reportInGroupApi, {
        method: 'GET',
        headers: headers,
    });

    if (!result.ok) {
        throw result;
    }

    const resultJson = await result.json();
    const reportDetails = new PowerBiReportDetails(resultJson.id, resultJson.name, resultJson.embedUrl);
    const reportEmbedConfig = new EmbedConfig();
    reportEmbedConfig.reportsDetail = [reportDetails];

    let datasetIds = [resultJson.datasetId];
    if (additionalDatasetId) {
        datasetIds.push(additionalDatasetId);
    }

    // Fetch the latest username from the database
    const latestUsername = await getLatestUsername();

    // Adding RLS restrictions for the latest user by creating an EffectiveIdentity object
    const identities = [
        {
            username: latestUsername,
            roles: ["Permissions"], // Adjust roles as needed
            datasets: datasetIds,
        }
    ];

    reportEmbedConfig.embedToken = await getEmbedTokenForSingleReportWithRLS(reportId, datasetIds, workspaceId, identities);
    return reportEmbedConfig;
}

/**
 * Generate Embed token for single report with user-specific restrictions (RLS).
 * @param {string} reportId
 * @param {Array<string>} datasetIds
 * @param {string} workspaceId
 * @param {Array<object>} identities - EffectiveIdentity objects for RLS
 * @return EmbedToken
 */
async function getEmbedTokenForSingleReportWithRLS(reportId, datasetIds, workspaceId, identities) {
    const formData = {
        reports: [{ id: reportId }],
        datasets: datasetIds.map(id => ({ id })),
        targetWorkspaces: workspaceId ? [{ id: workspaceId }] : null,
        identities // Adding RLS identities here
    };

    const embedTokenApi = "https://api.powerbi.com/v1.0/myorg/GenerateToken";
    const headers = await getRequestHeader();

    const result = await fetch(embedTokenApi, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(formData)
    });

    if (!result.ok) throw result;
    return result.json();
}

/**
 * Get Request header
 * @return Request header with Bearer token
 */
async function getRequestHeader() {
    let tokenResponse;
    try {
        tokenResponse = await auth.getAccessToken();
    } catch (err) {
        return { 'status': 401, 'error': err.toString() };
    }
    const token = tokenResponse.accessToken;
    return {
        'Content-Type': "application/json",
        'Authorization': utils.getAuthHeader(token)
    };
}

module.exports = {
    getEmbedInfo: getEmbedInfo
};

import { 
    SecretsManagerClient,
    GetSecretValueCommand,
    CreateSecretCommand,
    PutSecretValueCommand,
    DeleteSecretCommand,
    ListSecretsCommand,
    SecretListEntry,
  } from "@aws-sdk/client-secrets-manager";
  
  export interface SecretsManagerWrapperOptions {
    region: string;
    maxAttempts?: number;
  }
  
  export class AWSSecretsManagerWrapper {
    private client: SecretsManagerClient;
  
    constructor(options: SecretsManagerWrapperOptions) {
      this.client = new SecretsManagerClient({
        region: options.region,
        maxAttempts: options.maxAttempts,
      });
    }

    async getSecret(secretId: string): Promise< any > {
      const command = new GetSecretValueCommand({ SecretId: secretId });
      const response = await this.client.send(command);
      if (!response.SecretString) {
        throw new Error(`Secret ${secretId} has no SecretString field.`);
      }
      try {
        return JSON.parse(response.SecretString);
      } catch {
        return {};
      }
    }
  
    async createSecret(name: string, value: string): Promise<void> {
      const command = new CreateSecretCommand({
        Name: name,
        SecretString: value,
      });
      await this.client.send(command);
    }
  
    async updateSecret(secretId: string, value: string): Promise<void> {
      const command = new PutSecretValueCommand({
        SecretId: secretId,
        SecretString: value,
      });
      await this.client.send(command);
    }
  
    async deleteSecret(secretId: string, forceDeleteWithoutRecovery = false): Promise<void> {
      const command = new DeleteSecretCommand({
        SecretId: secretId,
        ForceDeleteWithoutRecovery: forceDeleteWithoutRecovery,
      });
      await this.client.send(command);
    }
  
    async listSecrets(
      maxResults?: number,
      nextToken?: string
    ): Promise<{ secrets: SecretListEntry[]; nextToken?: string }> {
      const command = new ListSecretsCommand({
        MaxResults: maxResults,
        NextToken: nextToken,
      });
      const response = await this.client.send(command);
  
      return {
        secrets: response.SecretList || [],
        nextToken: response.NextToken,
      };
    }
  }
  
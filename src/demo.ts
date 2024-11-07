import { ContainerServiceClient, ManagedCluster } from "@azure/arm-containerservice";
import { InteractiveBrowserCredential } from "@azure/identity";

const AZURE_CLI_APPID = "04b07795-8ddb-461a-bbee-02f9e1bf7b46";
const CORP_TENANT_ID = "72f988bf-86f1-41af-91ab-2d7cd011db47";
const SUBSCRIPTION_ID = "fb74b135-894b-4c1d-9b2e-8a3c231abc14";
const AKS_RESOURCE_GROUP = "jd-westcentralus";
const AKS_RESOURCE_NAME = "jd-aks-localaccount";

function getInteractiveTokenProvider() {
    return new InteractiveBrowserCredential({
        clientId: AZURE_CLI_APPID,
        tenantId: CORP_TENANT_ID
    });
}

function getContainerServiceClientFactory() {
    let client: ContainerServiceClient;

    return {
        getClient: () => {
            if (client === undefined) {
                client = new ContainerServiceClient(getInteractiveTokenProvider(), SUBSCRIPTION_ID);
            }

            return client;
        }
    };
}

const clientFactory = getContainerServiceClientFactory();

async function getDEMOCluster() {
    const client = clientFactory.getClient();

    return await client.managedClusters.get(AKS_RESOURCE_GROUP, AKS_RESOURCE_NAME);
}

function installChaosMesh(cluster: ManagedCluster) {
    const client = clientFactory.getClient();

    return client.managedClusters.beginRunCommandAndWait(AKS_RESOURCE_GROUP, AKS_RESOURCE_NAME, {
        command: "helm repo add chaos-mesh https://charts.chaos-mesh.org && helm repo update && kubectl create ns chaos-mesh && helm install chaos-mesh chaos-mesh/chaos-mesh -n=chaos-mesh --version 2.7.0"
    });
}

function removeChaosMesh(cluster: ManagedCluster) {
    const client = clientFactory.getClient();

    return client.managedClusters.beginRunCommandAndWait(AKS_RESOURCE_GROUP, AKS_RESOURCE_NAME, {
        command: "helm uninstall chaos-mesh -n chaos-mesh"
    });
}

export async function demo() {
    try {
        const demoCluster = await getDEMOCluster();

        const setupResponse = await installChaosMesh(demoCluster);

        console.log(JSON.stringify(setupResponse));

        // const cleanUpResponse = await removeChaosMesh(demoCluster);

        // console.log(JSON.stringify(cleanUpResponse));
    } catch (exception) {
        console.log(JSON.stringify(exception));
    }
};
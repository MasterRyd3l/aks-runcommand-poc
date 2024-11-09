import { ContainerServiceClient, ManagedCluster, RunCommandResult } from "@azure/arm-containerservice";
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

async function runCommand(command:string) {
    console.log("Running command on AKS:", command);

    const client = clientFactory.getClient();

    const response = await client.managedClusters.beginRunCommandAndWait(AKS_RESOURCE_GROUP, AKS_RESOURCE_NAME, {
        command
    });

    console.log(`ID: ${response.id}`, `\nProvisioning State: ${response.provisioningState}`, `\nLogs: ${response.logs}`);

    return response;
}

function installChaosMesh() {
    console.log("Installing Chaos Mesh...");

    const command = "helm repo add chaos-mesh https://charts.chaos-mesh.org && helm repo update && kubectl create ns chaos-testing && helm install chaos-mesh chaos-mesh/chaos-mesh -n=chaos-testing --set chaosDaemon.runtime=containerd --set chaosDaemon.socketPath=/run/containerd/containerd.sock --version 2.7.0";

    runCommand(command);
}

function removeChaosMesh() {
    console.log("Removing Chaos Mesh...");

    const command = "helm uninstall chaos-mesh -n chaos-testing && kubectl delete ns chaos-testing";

    runCommand(command);
}

function runPodChaos() {
    console.log("Running PodChaos...");

    const command = `echo "apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: pod-kill-example
  namespace: chaos-testing
spec:
  action: pod-kill
  mode: all
  selector:
    namespaces:
      - chaos-testing
    labelSelectors:
      'app.kubernetes.io/component': 'chaos-dashboard'
  duration: 30s" | kubectl apply -f -`;

    runCommand(command);
}

export async function demo() {
    try {
        // const demoCluster = await getDEMOCluster();

        // await installChaosMesh();

        await runPodChaos();

        // await removeChaosMesh();
    } catch (exception) {
        console.log(JSON.stringify(exception));
    }
};
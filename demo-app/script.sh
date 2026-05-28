# Create a namespace to keep it clean
kubectl create namespace boutique

# Deploy everything in one shot
kubectl apply -n boutique -f https://raw.githubusercontent.com/GoogleCloudPlatform/microservices-demo/main/release/kubernetes-manifests.yaml

# Watch it come up (11 pods total)
kubectl get pods -n boutique -w



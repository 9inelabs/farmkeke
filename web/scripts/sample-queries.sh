#!/usr/bin/env bash
# Saves real responses from read-only public queries into convex-spec/samples/
# so the shapes the website reads are documented. Run from the repo root.
# Queries never write, so this is safe against the shared deployment.
O=web/convex-spec/samples
mkdir -p "$O"
T=$(date +%F)
run() { npx convex run "$1" "$2" > "$O/$3.json" 2>&1; echo "$3: $(head -c 70 "$O/$3.json" | tr '\n' ' ')"; }
run storefront:home "{\"today\":\"$T\"}" storefront.home &
run storefront:popular '{}' storefront.popular &
run storefront:farmAreas '{}' storefront.farmAreas &
run storefront:collection "{\"kind\":\"fresh\",\"today\":\"$T\"}" storefront.collection &
run storefront:categoryListings '{"slug":"vegetables"}' storefront.categoryListings &
run storefront:search '{"text":"tomato"}' storefront.search &
run areas:listServedStates '{}' areas.listServedStates &
run areas:listServiceAreas '{"state":"Imo"}' areas.listServiceAreas &
run areas:listPickupPoints '{}' areas.listPickupPoints &
run catalog:listCategories '{}' catalog.listCategories &
run catalog:listUnits '{}' catalog.listUnits &
run checkout:pickupPoints '{"state":"Imo"}' checkout.pickupPoints &
run areas:matchLocation '{"latitude":5.4705,"longitude":7.027}' areas.matchLocation &
run appConfig:get '{}' appConfig.get &
run payments/config:get '{}' payments.config.get &
wait

import { config } from "@onflow/fcl"
import publicConfig from "../publicConfig"
import {send as httpSend} from "@onflow/transport-http"

config({
  "accessNode.api": publicConfig.accessNodeAPI,
  "discovery.wallet": publicConfig.walletDiscovery,
  "sdk.transport": httpSend,
  "app.detail.title": "Fruit Bowl",
  "app.detail.icon": "https://fruit-bowl.vercel.app/_next/image?url=%2Fpeachy-pink.png&w=128&q=75"
})
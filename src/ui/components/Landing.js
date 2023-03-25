import * as fcl from "@onflow/fcl"
import Image from "next/image"
import { useRouter } from 'next/router'
import { classNames } from "../lib/utils"
import { useRecoilState } from "recoil"
import {
  transactionInProgressState
} from "../lib/atoms"
import publicConfig from "../publicConfig"
import styles from "../styles/Landing.module.css"

export default function Landing(props) {
  const router = useRouter()
  const [transactionInProgress] = useRecoilState(transactionInProgressState)

  return (
    <div className="flex flex-col gap-y-20">
      <div className="mt-10 flex gap-y-5 sm:gap-x-5 flex-col-reverse sm:flex-row justify-between items-center">
        <Image src="/fruit-bowl.png" alt="" width={400} height={400} priority={true} />
        <div className="px-2 flex flex-col gap-y-8">
          <div className="flex flex-col">
            <div className={`font-flow text-black font-bold text-4xl sm:text-4xl`}>
              Fun social defi dapp for friendly wagers
            </div>
          </div>
          <div className="flex flex-col">
            <div className={`p-2 mb-2 font-flow text-2xl`}>
              1. Host starts a bowl
            </div>
            <div className={`p-2 mb-2 font-flow text-2xl`}>
              2. Users pays to the vault and make picks
            </div>
            <div className={`p-2 mb-2 font-flow text-2xl`}>
              3. Host/judges decide, winners split the vault equally
            </div>
           
          </div>

          {props.user && props.user.loggedIn ?
            <div className="-mt-5 flex flex-col gap-y-2">
              <div className="flex gap-x-2">
                <button
                  type="button"
                  disabled={transactionInProgress}
                  className={classNames(
                    transactionInProgress ? "bg-drizzle-green-light text-gray-400" : "bg-drizzle-green hover:bg-drizzle-green-dark text-gray-100",
                    "h-12 w-48 px-6 text-base rounded-2xl font-flow font-semibold shadow-sm text-gray-100"
                  )}
                  onClick={() => {
                    router.push("/create/bowl")
                  }}
                >
                  {"New Bowl"}
                </button>
                <button
                  type="button"
                  disabled={transactionInProgress}
                  className={classNames(
                    transactionInProgress ? "bg-drizzle-green-light text-gray-400" : "bg-drizzle-green hover:bg-drizzle-green-dark text-gray-100",
                    "h-12 w-48 px-6 text-base rounded-2xl font-flow font-semibold shadow-sm text-gray-100"
                  )}
                  onClick={() => {
                    router.push("/0xda2e6a8e50353b8c")
                  }}
                >
                  {"Join Bowls"}
                </button>
              </div>
            </div> :
            <button
              type="button"
              disabled={transactionInProgress}
              className={classNames(
                transactionInProgress ? "bg-drizzle-green-light text-gray-400" : "bg-drizzle-green hover:bg-drizzle-green-dark text-gray-100",
                "h-12 px-6 text-base rounded-2xl font-flow font-semibold shadow-sm text-gray-100"
              )}
              onClick={() => { fcl.authenticate() }}
            >
              {"Connect Wallet"}
            </button>
          }
        </div>
      </div>
    </div>
  )
}
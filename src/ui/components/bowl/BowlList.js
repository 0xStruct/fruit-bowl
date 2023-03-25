import { useState } from "react"
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useRecoilState } from "recoil"
import {
  transactionInProgressState
} from "../../lib/atoms"
import { classNames, convertCadenceDateTime, getItemsInPage, getRaffleStatus, getVerifierType } from '../../lib/utils'
import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/solid"

export default function BowlList(props) {
  const [transactionInProgress] = useRecoilState(transactionInProgressState)
  const router = useRouter()
  const { bowls, user, pageAccount } = props
  let isCurrentUser = false
  if (user && user.addr === pageAccount) {
    isCurrentUser = true
  }
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  return (
    <div className="p-2">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-gray-900">
            {isCurrentUser ? `My Bowls (${bowls.length})` : `Bowls (${bowls.length})`}
          </h1>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <div hidden className="text-green-800 bg-green-100"></div>
          <div hidden className="text-blue-800 bg-blue-100"></div>
          <div hidden className="text-red-800 bg-red-100"></div>
          <div hidden className="text-yellow-800 bg-yellow-100"></div>
          {
            isCurrentUser ?
              <button
                type="button"
                disabled={transactionInProgress}
                className={
                  classNames(
                    transactionInProgress ? "bg-drizzle-green-light" : "bg-drizzle-green hover:bg-drizzle-green-dark",
                    "inline-flex items-center rounded-2xl justify-center border border-transparent px-4 py-2 text-sm font-medium text-black shadow-sm focus:outline-none focus:ring-2 focus:ring-drizzle-green focus:ring-offset-2 sm:w-auto"
                  )}
                onClick={() => {
                  router.push("/create/bowl")
                }}
              >
                New Bowl
              </button> : null
          }
        </div>
      </div>

      {bowls.length > 0 ?
        <div className="mt-3 flex flex-col w-full">
          <div className="px-1 overflow-x-auto">
            <div className="inline-block min-w-full py-2 align-middle">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-2xl">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                        Name
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Entry Cost
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Eligibility
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        <div className="tooltip tooltip-bottom" data-tip="Drawned / Max Winners / Registrants">
                          # of Players
                        </div>
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Status
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Created At
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {getItemsInPage(bowls, currentPage, pageSize).map((bowl) => {
                      const status = getRaffleStatus(bowl)
                      bowl.status = status
                      return bowl
                    }).map((bowl) => (
                      <Link key={`${bowl.bowlID}-link`} href={`${bowl.host}/bowls/${bowl.bowlID}`}>
                        <tr key={bowl.bowlID}>
                          <td className="py-4 px-3 text-sm">
                            <div className="flex items-center">
                              <div className="h-10 w-24 flex-shrink-0 relative">
                                <Image className="rounded-lg" src={bowl.image ?? "/banner.png"} alt="" layout="fill" objectFit="contain" />
                              </div>
                              <div className="ml-4">
                                <label className="block font-medium text-gray-900 break-words w-[120px] max-w-[300px] min-w-[60px]">{`${bowl.name}`}</label>
                              </div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            <div className="text-gray-500">
                              {`${bowl.wagerAmount} ${bowl.tokenInfo.symbol}`}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {getVerifierType(bowl, "RAFFLE")}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {/*`${Object.keys(bowl.winners).length} / ${bowl.numberOfWinners} / ${Object.keys(bowl.registrationRecords).length}`*/}
                            {`${Object.keys(bowl.registrationRecords).length}`}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            <label className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${bowl.status.tagColor}`}>
                              {bowl.status.title}
                            </label>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {convertCadenceDateTime(bowl.createdAt).toDateString()}
                          </td>
                        </tr>
                      </Link>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          {bowls.length > pageSize ?
            <div className="mt-2 flex justify-between">
              <button
                className="bg-gray-50 p-2 rounded-full overflow-hidden shadow ring-1 ring-black ring-opacity-5"
                disabled={currentPage == 1}
                onClick={() => {
                  if (currentPage == 1) { return }
                  setCurrentPage(currentPage - 1)
                }}
              >
                <ArrowLeftIcon
                  className={`h-5 w-5 ${currentPage == 1 ? "text-gray-400" : "text-black"}`}
                />
              </button>
              <button
                className="bg-gray-50 h-9 w-9 rounded-full overflow-hidden shadow ring-1 ring-black ring-opacity-5"
                disabled={true}
              >{currentPage}</button>
              <button
                className="bg-gray-50 p-2 rounded-full overflow-hidden shadow ring-1 ring-black ring-opacity-5"
                disabled={currentPage * pageSize >= bowls.length}
                onClick={() => {
                  if (currentPage * pageSize >= bowls.length) {
                    return
                  }
                  setCurrentPage(currentPage + 1)
                }}
              >
                <ArrowRightIcon className={`h-5 w-5 ${currentPage * pageSize >= bowls.length ? "text-gray-400" : "text-black"}`} />
              </button>
            </div> : null
          }
        </div> :
        <div className="flex mb-10 justify-center">
          <label className="leading-[200px] font-flow font-medium text-base text-gray-500">
            {isCurrentUser ? "You haven't created Bowl yet" : "This account haven't created Bowl yet"}
          </label>
        </div>}
    </div>
  )
}
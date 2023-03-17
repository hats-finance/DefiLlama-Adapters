const sdk = require("@defillama/sdk");
const { sumTokens2, } = require('../../helper/unwrapLPs')

const abi = require("./abis");
const address = require("./address");

async function tvl(_, _1, _cb, { api, }) {
  const { UiPoolDataProvider, PoolAddressProvider, UniV3Pos, P2PPairStaking, Bayc, Bakc, Mayc } = address[api.chain]
  let [reservesData] = await api.call({
    target: UiPoolDataProvider,
    params: PoolAddressProvider,
    abi: abi.UiPoolDataProvider.getReservesData,
  })

  const balances = {};
  if (UniV3Pos) {
    const isUniV3XToken = i => i.underlyingAsset.toLowerCase() === UniV3Pos.toLowerCase()

    const uniswapOwners = reservesData.filter(isUniV3XToken).map(i => i.xTokenAddress)
    reservesData = reservesData.filter(i => !isUniV3XToken(i))
    await sumTokens2({ api, balances, owners: uniswapOwners, resolveUniV3: true, })
  }
  let toa = reservesData.map(i => ([i.underlyingAsset, i.xTokenAddress]))
  toa.push(...[[Bayc, P2PPairStaking], [Mayc, P2PPairStaking], [Bakc, P2PPairStaking]])
  return sumTokens2({ balances, tokensAndOwners: toa, blacklistedTokens: ['0x0000000000000000000000000000000000000001'] })
}

async function borrowed(_, _1, _cb, { api, }) {
  const { UiPoolDataProvider, PoolAddressProvider, } = address[api.chain]
  let [reservesData] = await api.call({
    target: UiPoolDataProvider,
    params: PoolAddressProvider,
    abi: abi.UiPoolDataProvider.getReservesData,
  })

  const balances = {};

  reservesData.forEach((d) => {
    if (d.underlyingAsset.toLowerCase() === address.ethereum.cAPE.toLowerCase()) return; // cAPE number inflated because of the hack?
    sdk.util.sumSingleBalance(balances, d.underlyingAsset, d.totalScaledVariableDebt * d.variableBorrowIndex * 1e-27, api.chain)
  })

  return balances;
}

module.exports = {
  tvl,
  borrowed,
};

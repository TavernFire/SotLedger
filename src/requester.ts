import { resolveTxt } from 'dns';
import fetch from 'node-fetch';
import { companies } from './companies';
import { CompanyLedger, CompanyBand, BandPrize, BandUser } from './models/companyLedger';

export default class Requester 
{
    public requestCompany(company: typeof companies[0], ratToken: string): Promise<CompanyLedger>
    {
        return new Promise((resolve, reject) =>
            this.fetchCompany(company.url, ratToken)
                .then((result: any) =>
                {
                    //console.dir(result,  { depth: null });
                    var current = result.current.global;
                    try {
                        var user = current.user ?? {
                            band: 3,
                            toNextRank: 0,
                            rank: -1,
                            score: 0
                        };
                        var topband = current.Bands[0];
                        const resultUserBand = current.Bands[user.band];
                        const companyBands = this.convertBands(current.Bands, user.band, company.tiers)
                        resolve(new CompanyLedger(
                            company.name,
                            company.color,
                            company.tiers.reverse(),
                            user.rank,
                            user.band,
                            companyBands[user.band],
                            topband.Results[topband.Results.length - 1].Score - user.score,
                            user.score - (resultUserBand.Results[resultUserBand.Results.length - 1].Score),
                            companyBands
                        ));
                    } catch (e) {
                        throw [e, result];
                    }
                })
                .catch(error => console.log(error)));
    }

    private fetchCompany(url: string, ratToken: string)
    {
        return new Promise((resolve, reject) =>
            fetch(url, { headers: 
                { 
                    "Cookie": 'rat=' + ratToken,
                    "Referer": "https://www.seaofthieves.com/leaderboards",
                    "User-Agent": 'SotLedger'
                }})
                .then(res => {
                    try {
                        return res.json();
                    } catch(e) {
                        reject([e, res.text()]);
                    }
                }) 
                .then(json => resolve(json))
                .catch(error => reject(error)));
    }

    private convertBandUser(raw: any): BandUser
    {
        if(raw)
        {
            return new BandUser(
                raw.GamerTag,
                raw.Score,
                raw.GlobalRank
            );
        }
        else
        {
            return undefined;
        }
    }

    private convertBandPrize(raw: any): BandPrize
    {
        if(!raw)
        {
            return null;
        }
        return new BandPrize(
            raw.Id,
            raw.Owned,
        )
    }

    private convertBands(bands: any, userBandId: Number, companyTiers: string[]): CompanyBand[]
    {
        let result = [];
        for(const band of bands)
        {
            const containsRequestingUser = band.Index === userBandId;
            result.push(
                new CompanyBand(
                    band.Index,
                    companyTiers.reverse()[band.Index],
                    containsRequestingUser,
                    this.convertBandUser(band.Results[0]),
                    this.convertBandUser(band.Results[band.Results - 1]),
                    this.convertBandPrize(band.TitleEntitlement),
                    this.convertBandPrize(band.Entitlements),
                )
            );
        }
        return result;
    }
}
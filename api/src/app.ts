#!/usr/bin/env node

import express  from 'express';
import rateLimit from 'express-rate-limit';
import xss from 'xss-clean';
import {AppsHeadersMiddleware} from "./config/apps.headers.middleware.js";
import {AuthMiddleware} from "./config/auth.middleware.js";
import {AppDataSource} from "./config/database.config.js";
import {baseUrl, HOST, PORT} from "./config/config.js";
import {AccountsController} from "./controller/accounts.controller.js";
import {RiotRequestsManager} from "./riot/riot.requests.manager.js";
import {ChampionObject} from "./response/riot/champion.model.js";
import {ChampionsController} from "./controller/champions.controller.js";
import {MatchesController} from "./controller/matches.controller.js";
import {TftAugment} from "./response/custom/tft.augment.js";
import {TftChampionInfo, TftItemInfo} from "./response/riot/tft.match.info.js";
import {HomeController} from "./controller/home.controller.js";

export let imagesVersion = '14.11.1';
export let championsList = new Array<ChampionObject>();
export let tftAugments = new Array<TftAugment>();
export let tftChampions = new Array<TftChampionInfo>();
export let tftItems = new Array<TftItemInfo>();

const app = express();
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'You are not Allowed To Access This Api, Too many requests'
});

/**
 * Additional Services To use
 */
app.use(limiter)
app.use(xss())
app.use(express.json());
app.use((req, res, next) => {
    AppsHeadersMiddleware.onValidateAppsHeaders(req, res, next);
})

app.use((req, res, next) => {
    AuthMiddleware.onValidateAuthHeaders(req, res, next);
})

/**
 * Register Public Routes
 */
app.get('/ping', (req, res) => res.send('Working :P'))

/**
 * Register App Routes
 */
new AccountsController().initControllerRoutes(app);
new ChampionsController().initControllerRoutes(app);
new MatchesController().initControllerRoutes(app);
new HomeController().initControllerRoutes(app);

/**
 * Fetch Static Data Once App Running
 */
RiotRequestsManager.getCurrentAppVersion()
    .then((version) => {
        imagesVersion = version
        getApplicationChampions(imagesVersion);
    })
    .catch((ex) => {
        console.error(ex)
        imagesVersion = '14.11.1';
    })

RiotRequestsManager.getTftAugments()
    .then((items) => {
        items.forEach((item) => {
            tftAugments.push(item)
        })
    })
    .catch((ex) => {
        console.error(ex)
    })

RiotRequestsManager.getTftChampions()
    .then((items) => {
        items.forEach((item) => {
            tftChampions.push(item)
        })
    })
    .catch((ex) => {
        console.error(ex)
    })

RiotRequestsManager.getTftItems()
    .then((items) => {
        items.forEach((item) => {
            tftItems.push(item)
        })
    })
    .catch((ex) => {
        console.error(ex)
    })

function getApplicationChampions(version: string) {
    RiotRequestsManager.getApplicationChampions(version)
        .then((result) => {
            result.forEach((item) => {
                championsList.push(item)
            })
        })
        .catch((ex) => {
            console.error(ex)
        })
}

AppDataSource.initialize()
    .then(async () => {
        app.listen(Number(PORT), HOST, () => console.log('Server is up and running in ' + baseUrl));
        console.log("Data Source has been initialized!");
    })
    .catch((error) => console.log(error));

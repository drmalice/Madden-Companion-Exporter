const express = require('express');
const admin = require('firebase-admin');

const app = express();

// TODO: Enter the path to your service account json file
// Need help with this step go here: https://firebase.google.com/docs/admin/setup

const serviceAccount = require("./maddencfm-33e39-firebase-adminsdk-xz9w5-422a99d20d.json");
// TODO: Enter your database url from firebase

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://maddencfm-33e39.firebaseio.com/"
});

app.set('port', (process.env.PORT || 5000));

// get user 
app.get('*', (req, res) => {
    res.send('Madden Companion Exporter');
});

// delete user data
app.get('/delete/:user', function(req, res) {
    const db = admin.database();
    const ref = db.ref();
    const dataRef = ref.child(req.params.user);
    dataRef.remove();
    return res.send('Madden Data Cleared for ' + req.params.user);
});

// league teams
app.post('/:platform/:leagueId/leagueteams', (req, res) => {
    const db = admin.database();
    const ref = db.ref();
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', () => {
        const { leagueTeamInfoList: teams } = JSON.parse(body);
        const { params: { username, leagueId } } = req;

        const teamRef = ref.child(`${username}/data/team/leagueTeamInfoList`);
        teamRef.update(teams);
        
        res.sendStatus(200);
    });
});

// standings
app.post('/:platform/:leagueId/standings', (req, res) => {
    const db = admin.database();
    const ref = db.ref();
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', () => {
        const { teamStandingInfoList: teams } = JSON.parse(body);
        const {params: { username, leagueId }} = req;

        const teamRef = ref.child(`${username}/data/standings/teamStandingInfoList`);
        teamRef.update(teams);

        res.sendStatus(200);
    });
});

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

app.post(
    '/:platform/:leagueId/week/:weekType/:weekNumber/:dataType',
    (req, res) => {
        const db = admin.database();
        const ref = db.ref();
        const {
            params: { username, leagueId, weekType, weekNumber, dataType },
        } = req;
        const basePath = `data/${username}/${leagueId}/`;
        // "defense", "kicking", "passing", "punting", "receiving", "rushing"
        const statsPath = `${basePath}stats`;
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            switch (dataType) {
                case 'schedules': {
                    const weekRef = ref.child(
                        `${basePath}schedules/${weekType}/${weekNumber}`
                    );
                    const { gameScheduleInfoList: schedules } = JSON.parse(body);
                    weekRef.update(schedules);
                    break;
                }
                case 'teamstats': {
                    const { teamStatInfoList: teamStats } = JSON.parse(body);
                    teamStats.forEach(stat => {
                        const weekRef = ref.child(
                            `${statsPath}/${weekType}/${weekNumber}/${stat.teamId}/team-stats`
                        );
                        weekRef.update(stat);
                    });
                    break;
                }
                case 'defense': {
                    const { playerDefensiveStatInfoList: defensiveStats } = JSON.parse(body);
                    defensiveStats.forEach(stat => {
                        const weekRef = ref.child(
                            `${statsPath}/${weekType}/${weekNumber}/${stat.teamId}/player-stats/${stat.rosterId}`
                        );
                        weekRef.update(stat);
                    });
                    break;
                }
                default: {
                    const property = `player${capitalizeFirstLetter(
                        dataType
                    )}StatInfoList`;
                    const stats = JSON.parse(body)[property];
                    stats.forEach(stat => {
                        const weekRef = ref.child(
                            `${statsPath}/${weekType}/${weekNumber}/${stat.teamId}/player-stats/${stat.rosterId}`
                        );
                        weekRef.update(stat);
                    });
                    break;
                }
            }

            res.sendStatus(200);
        });
    }
);

// ROSTERS
app.post('/:platform/:leagueId/freeagents/roster', (req, res) => {
    res.sendStatus(200);
});

app.post('/:platform/:leagueId/team/:teamId/roster', (req, res) => {
    const db = admin.database();
    const ref = db.ref();
    const {
        params: { username, leagueId, teamId }
    } = req;
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', () => {
        const { rosterInfoList } = JSON.parse(body);
        const dataRef = ref.child(
            `data/${username}/${leagueId}/teams/${teamId}/roster`
        );
        const players = {};
        rosterInfoList.forEach(player => {
            players[player.rosterId] = player;
        });
        dataRef.set(players, error => {
            if (error) {
                console.log('Data could not be saved.' + error);
            } else {
                console.log('Data saved successfully.');
            }
        });
        res.sendStatus(200);
    });
});

app.listen(app.get('port'), () =>
    console.log('Madden Data is running on port', app.get('port'))
);

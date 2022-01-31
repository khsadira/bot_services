const fs = require('fs');

const { GUILD_ID, TOKEN, BOT_ID, WEBHOOK_ID, WORK_ACTIVITY_NAME, USERS_ACTIVITY_NAME,
        EMBED_ACTIVITY_IMAGE_LINK, EMBED_TAG_COLOR_STICKY_SERVICE, EMBED_TAG_COLOR_SERVICE_ON, EMBED_TAG_COLOR_SERVICE_OFF,
        INFO_SERVICE_CHAN_ID, PRISE_SERVICE_CHAN_ID, TEMPS_SERVICE_CHAN_ID, RECAP_SERVICE_CHAN_ID } = require('./config.json');


const { Client, Collection, Intents, MessageEmbed  } = require('discord.js');
const client = new Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS],
    partials: ['MESSAGE', 'CHANNEL'],
});


var currentGuild;

var infoServiceChan;
var priseServiceChan;
var syntheseServiceChan;
var syntheseServiceRecapChan;

var infoServiceStickyMsg = undefined;

let playerInService = []
var usersMeta = {}


const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

function writeUserMeta() {
    fs.writeFileSync("users_meta.json", JSON.stringify(usersMeta), function (err) {
        if (err) throw err;
        console.log('Fichier créé !');
    });
}

async function getUserNickname(guild, userID) {
    var user = await guild.members.fetch(userID).catch(error => {
        return undefined
    });;

    if (user && user.nickname) {
        return user.nickname
    }

    return undefined;
}

function reworkTime(totalMinutes) {
    var hours = Math.floor(totalMinutes / 60);          
    var minutes = totalMinutes % 60;

    return hours + "h" + minutes
}

async function getLittleUserEmbed(userData, userID) {
    var userName = await getUserNickname(currentGuild, userID)
    var time = await reworkTime(userData.time)

    return new MessageEmbed()
                .setTitle(capitalize(USERS_ACTIVITY_NAME) + " " + userName)
                .setThumbnail(EMBED_ACTIVITY_IMAGE_LINK)
                .setColor(EMBED_TAG_COLOR_STICKY_SERVICE)
                .setDescription("<@" + userID + ">\n\n**Semaine**\n- Temps en service: " + time + "\n- Nombre de service: " + userData.nbservice)
                .setFooter({text: userID})
}

async function getUserEmbed(userData, userID) {
    var userName = await getUserNickname(currentGuild, userID)
    var time = await reworkTime(userData.time)
    var totaltime = await reworkTime(userData.totaltime)

    return new MessageEmbed()
                .setTitle(capitalize(USERS_ACTIVITY_NAME) + " " + userName)
                .setThumbnail(EMBED_ACTIVITY_IMAGE_LINK)
                .setColor(EMBED_TAG_COLOR_STICKY_SERVICE)
                .setDescription("<@" + userID + ">\n\n**Semaine**\n- Temps en service: " + time + "\n- Nombre de service: " + userData.nbservice + "\n\n**Total**\n- Temps en service: " + totaltime + "\n- Nombre de service: " + userData.totalnbservice)
                .setFooter({text: userID})
}

async function reassignMessage() {
    let lastMsg = null, lastlastMsg = "B"

    while (lastMsg != lastlastMsg) {
        lastlastMsg = lastMsg

        await syntheseServiceChan.messages.fetch({ limit: `100`, before: lastMsg }).then(messages => {
            messages.forEach(msg => {
                lastMsg = msg.id
                if (!(msg && msg.embeds && msg.embeds[0] && msg.embeds[0].footer && msg.embeds[0].footer.text && usersMeta.hasOwnProperty(msg.embeds[0].footer.text))) {
                    msg.delete().catch(error => {
                        if (error.code !== 10008) {
                            console.error('Failed to delete the message:', error);
                        }
                    });
                }
            });
        });
    }
}

function writeBotActivity(nbUser) {
    if (nbUser <= 1) {
        client.user.setActivity(nbUser + " " + ACTIVITY_NAME + " en service", {type: 'WATCHING'});
    } else {
        client.user.setActivity(nbUser + " " + ACTIVITY_NAME + "s en service", {type: 'WATCHING'});
    }
}

client.login(TOKEN)

client.on("ready", async () => {
    console.log(BOT_NAME + " bot a été démarré.")

    currentGuild = await client.guilds.cache.get(GUILD_ID);
    infoServiceChan = await currentGuild.channels.cache.find(channel => channel.id === INFO_SERVICE_CHAN_ID);
    priseServiceChan = await currentGuild.channels.cache.find(channel => channel.id === PRISE_SERVICE_CHAN_ID);
    syntheseServiceChan = await currentGuild.channels.cache.find(channel => channel.id === TEMPS_SERVICE_CHAN_ID);
    syntheseServiceRecapChan = await currentGuild.channels.cache.find(channel => channel.id === RECAP_SERVICE_CHAN_ID);

    await infoServiceChan.messages.fetch({limit: `100`}).then(messages => {
        messages.forEach(msg => {
            if (msg.author.id == BOT_ID) {
                writeBotActivity(0)
                infoServiceStickyMsg = msg;
                var descriptionString = "**Nombre de " + USERS_ACTIVITY_NAME + " en service: 0**";
                const embed = new MessageEmbed()
                    .setTitle(WORK_ACTIVITY_NAME + ": "+ capitalize(USERS_ACTIVITY_NAME) + " en service")
                    .setThumbnail(EMBED_ACTIVITY_IMAGE_LINK)
                    .setColor(EMBED_TAG_COLOR_STICKY_SERVICE)
                    .setDescription(descriptionString);

                infoServiceStickyMsg.edit({embeds:[embed]});
            }
        });
    });
    
    if (fs.existsSync('users_meta.json')) {
        let usersMetaTmp = fs.readFileSync('users_meta.json').toString();
        usersMeta = JSON.parse(usersMetaTmp);

        await reassignMessage();

        for (var userID in usersMeta) {
            var member = await currentGuild.members.fetch(userID).catch(error => {
                return undefined;
            });;

            if (member == undefined) {
                var msg = await syntheseServiceChan.messages.fetch(usersMeta[userID].messageID).catch(error => {
                    return undefined;
                });

                if (msg != undefined) {
                    msg.delete().catch(error => {});
                }
                
                delete usersMeta[userID];
                writeUserMeta();
                continue;
            }
            
            var user = usersMeta[userID];
            var embed = await getUserEmbed(user, userID);

            if (!(user.messageID.length > 0)) {
                msg = await syntheseServiceChan.send({embeds:[embed]});
                user.messageID = msg.id;
                writeUserMeta();
            } else {
                var msg = await syntheseServiceChan.messages.fetch(user.messageID).catch(error => {
                    if (error.code == 10008) {
                        console.error('Failed to fetch message: ' + userID);
                    }
                    return undefined;
                });

                if (msg == undefined) {
                    msg = await syntheseServiceChan.send({embeds:[embed]});
                    user.messageID = msg.id;
                    writeUserMeta();
                } else {
                    msg.edit({embeds:[embed]});
                }
            }
        }
    }
});

let playerData = []

async function editRecapMessage(userID) {
    var user = usersMeta[userID]
    var embed = await getUserEmbed(user, userID)

    if (user.messageID != "") {
        var msg = await syntheseServiceChan.messages.fetch(user.messageID).catch(error => {
            if (error.code == 10008) {
                console.error('Failed to fetch message: ' + userID);
            }
            return undefined
        });

        if (msg == undefined) {
            msg = await syntheseServiceChan.send({embeds:[embed]});
            user.messageID = msg.id
        } else {
            msg.edit({embeds:[embed]})
        }

        writeUserMeta()
    } else {
        msg = await syntheseServiceChan.send({embeds:[embed]});
        user.messageID = msg.id
        writeUserMeta()
    }
}

async function deleteMessage(messageID) {
    let lastMsg = null, lastlastMsg = "B"
    
    while (lastMsg != lastlastMsg) {
        lastlastMsg = lastMsg

        await syntheseServiceChan.messages.fetch({ limit: `100`, before: lastMsg }).then(messages => {
            messages.forEach(msg => {
                lastMsg = msg.id
                if (msg.id == messageID) {
                    msg.delete().catch(error => {
                        if (error.code !== 10008) {
                            console.error('Failed to delete the message:', error);
                        }
                    });
                }
            });
        });
    }
}

client.on('messageCreate', async (message) => {
    if (message.guildId == GUILD_ID && message.author.id == WEBHOOK_ID) {
        if (message.channel.id == priseServiceChan) {
            content = message.content

            let i = content.indexOf(" a pris son service")

            if (i !== -1) {
                let name = content.substring(0, i)

                if (playerData[name] == undefined) {
                    playerData[name] = {}
                }

                playerData[name].isService = true
                playerData[name].start = new Date();

                if (playerData[name].serviceMessage !== undefined) {
                    playerData[name].serviceMessage.delete().catch(error => {
                        if (error.code !== 10008) {
                            console.error('Failed to delete the message:', error);
                        }
                    });
                }

                const embed = new MessageEmbed()
                    .setTitle(WORK_ACTIVITY_NAME + " service")
                    .setThumbnail(EMBED_ACTIVITY_IMAGE_LINK)
                    .setColor(EMBED_TAG_COLOR_SERVICE_ON)
                    .setDescription("**Nom du " + USERS_ACTIVITY_NAME + ": **<@"+name+">" + "\n**Status: **En service\n**Heure de la prise de service: **" + playerData[name].start.getHours() + ":" + playerData[name].start.getMinutes())
                    .setFooter({text: name});

                playerData[name].serviceMessage = await message.channel.send({embeds:[embed]});
                message.delete().catch(error => {
                    if (error.code !== 10008) {
                        console.error('Failed to delete the message:', error);
                    }
                });
            } else {
                i = content.indexOf(" a quitté son service")
                let name = content.substring(0, i)
                if (i !== -1) {
                    if (playerData[name] !== undefined) {
                        playerData[name].isService = false
                        playerData[name].end = new Date();
                        if (playerData[name] !== undefined && playerData[name].serviceMessage) {
                            playerData[name].serviceMessage.delete().catch(error => {
                                if (error.code !== 10008) {
                                    console.error('Failed to delete the message:', error);
                                }
                            });
                        }
                        let time = new Date(playerData[name].end - playerData[name].start)
                        let hours = time.getHours()-1
                        let minutes = time.getMinutes()

                        if (usersMeta[name] == undefined) {
                            usersMeta[name] = {
                                "time": 0,
                                "totaltime": 0,
                                "nbservice": 0,
                                "totalnbservice": 0,
                                "messageID": ""
                            };
                        }

                        usersMeta[name].time += hours*60 + minutes;
                        usersMeta[name].totaltime += hours*60 + minutes;
                        usersMeta[name].nbservice++;
                        usersMeta[name].totalnbservice++;
                        editRecapMessage(name);

                        if (!(hours == 0 && minutes < 5)) {

                            const embed = new MessageEmbed()
                            .setTitle(WORK_ACTIVITY_NAME + " service")
                            .setThumbnail(EMBED_ACTIVITY_IMAGE_LINK)
                            .setColor(EMBED_TAG_COLOR_SERVICE_OFF)
                            .setDescription("**Nom du " + USERS_ACTIVITY_NAME + ": **<@"+name+">" + "\n**Status: **Hors service\n**Heure du début de service: **" + playerData[name].start.getHours() + ":" + playerData[name].start.getMinutes()
                            + "\n**Heure de la fin de service: **" + playerData[name].end.getHours() + ":" + playerData[name].end.getMinutes() + "\n**Temps de service: **" + (hours) + ":" + minutes)
                            .setFooter({text: name});
            
                            await message.channel.send({embeds:[embed]});
                            if (playerData[name] !== undefined) {
                                delete playerData[name]
                            }
                        }

                        await message.delete().catch(error => {
                            if (error.code !== 10008) {
                                console.error('Failed to delete the message:', error);
                            }
                        });
                    }
                }
            }
        }
    }
});


client.on('messageCreate', async (message) => {
    if (message.guildId == GUILD_ID && message.author.id == WEBHOOK_ID && message.channel.id == PRISE_SERVICE_CHAN_ID) {
        content = message.content

        let i = content.indexOf(" a pris son service")

        if (i !== -1) {
            let name = content.substring(0, i)

            if (playerInService.indexOf(name) == -1) {
                playerInService.push(name)
            }
        } else {
            i = content.indexOf(" a quitté son service")
            let name = content.substring(0, i)

            if (i !== -1) {
                var e = playerInService.indexOf(name)
                if (e != -1) {
                    playerInService.splice(e, 1)
                }
            }
        }

        writeBotActivity(playerInService.length)
        var descriptionString = "**Nombre de " + USERS_ACTIVITY_NAME + " en service: " + playerInService.length + "**\n"
        for (var userID of playerInService) {
            descriptionString += "<@" + userID + ">\n"
        }

        const embed = new MessageEmbed()
                            .setTitle(WORK_ACTIVITY_NAME + ": "+ capitalize(USERS_ACTIVITY_NAME) + " en service")
                            .setThumbnail(EMBED_ACTIVITY_IMAGE_LINK)
                            .setColor(EMBED_TAG_COLOR_STICKY_SERVICE)
                            .setDescription(descriptionString)
                            
        if (infoServiceStickyMsg == undefined) {
            infoServiceStickyMsg = await infoServiceChan.send({embeds:[embed]})
        } else {
            infoServiceStickyMsg.edit({embeds:[embed]})
        }
    }
});

client.on('messageCreate', async (message) => {
    if (message.guildId == GUILD_ID && (message.author.id == BOT_ID)) {
        if (message.content.indexOf("!dservice") != -1) {
            var data = message.content.split(" ")
            if (data.length >= 2 && usersMeta[data[1]]) {
                deleteMessage(usersMeta[data[1]].messageID)
                delete usersMeta[data[1]];
                writeUserMeta();
            }
            message.delete().catch(error => {
                if (error.code !== 10008) {
                    console.error('Failed to delete the message:', error);
                }
            });
        }  else if (message.channel.id == RECAP_SERVICE_CHAN_ID && message.content == "!rservices") {
            message.delete().catch(error => {
                if (error.code !== 10008) {
                    console.error('Failed to delete the message:', error);
                }
            });
            for (var userID in usersMeta) {
                var embed = await getLittleUserEmbed(usersMeta[userID], userID)

                syntheseServiceRecapChan.send({embeds:[embed]});
                usersMeta[userID].time = 0;
                usersMeta[userID].nbservice = 0;
                editRecapMessage(userID);
            }
        }
    }
});

client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.data.name, command);
}

client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;

	const command = client.commands.get(interaction.commandName);

	if (!command) return;

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
	}
});
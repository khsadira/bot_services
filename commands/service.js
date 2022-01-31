const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const { MessageEmbed  } = require('discord.js');

const { GUILD_ID, USERS_ACTIVITY_NAME, EMBED_ACTIVITY_IMAGE_LINK, EMBED_TAG_COLOR_STICKY_SERVICE } = require('../config.json');

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

function reworkTime(totalMinutes) {
    var hours = Math.floor(totalMinutes / 60);          
    var minutes = totalMinutes % 60;

    return hours + "h" + minutes
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

async function getUserEmbed(userData, userID, guild) {
    var userName = await getUserNickname(guild, userID)
    var time = await reworkTime(userData.time)
    var totaltime = await reworkTime(userData.totaltime)

    return new MessageEmbed()
                .setTitle(capitalize(USERS_ACTIVITY_NAME) + " " + userName)
                .setThumbnail(EMBED_ACTIVITY_IMAGE_LINK)
                .setColor(EMBED_TAG_COLOR_STICKY_SERVICE)
                .setDescription("<@" + userID + ">\n\n**Semaine**\n- Temps en service: " + time + "\n- Nombre de service: " + userData.nbservice + "\n\n**Total**\n- Temps en service: " + totaltime + "\n- Nombre de service: " + userData.totalnbservice)
                .setFooter({text: userID})
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('service')
		.setDescription("Montre les temps et nombre de services de la semaine."),
	async execute(interaction) {
		if (interaction.guildId == GUILD_ID) {
            var usersMetaTmp = await fs.readFileSync('users_meta.json').toString()
            var usersMeta = JSON.parse(usersMetaTmp)
            if (usersMeta[interaction.user.id] !== undefined) {
                var embed = await getUserEmbed(usersMeta[interaction.user.id], interaction.user.id, interaction.guild)
                return interaction.reply({ embeds:[embed], ephemeral: true });
            } else {
                return interaction.reply({ content: `Tu n'as pas encore terminé de service !`, ephemeral: true });
            }
		} else {
			return interaction.reply({ content: `Tu n'as pas l'autorisation pour utiliser cette commande.`, ephemeral: true });
		}
	}
};
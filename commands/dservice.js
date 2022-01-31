const { SlashCommandBuilder } = require('@discordjs/builders');

const { GUILD_ID, TEMPS_SERVICE_CHAN_ID, MANAGERS_ROLE_ID, USERS_ACTIVITY_NAME } = require('../config.json');

function roleIsAllowed(roles) {
    for (var managerRoleID of MANAGERS_ROLE_ID) {
        if (roles.cache.has(managerRoleID)) {
            return true
        }
    }
    return false
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('dservice')
		.setDescription("Supprime un " + USERS_ACTIVITY_NAME + " de la DB.")
        .addStringOption(option => option.setName('userid').setDescription("Selectionner l'ID du " + USERS_ACTIVITY_NAME + " à effacer").setRequired(true)),
	async execute(interaction) {
		if (interaction.guildId == GUILD_ID && roleIsAllowed(interaction.guild.members.cache.get(interaction.user.id).roles)) {
			const channel = interaction.guild.channels.cache.get(TEMPS_SERVICE_CHAN_ID)

			channel.send("!dservice" + " " + interaction.options.getString("userid"))
			return interaction.reply({ content: `Tu as supprimé un ` + TEMPS_SERVICE_CHAN_ID +  ` de la DB.`, ephemeral: true });
		} else {
			return interaction.reply({ content: `Tu n'as pas l'autorisation pour utiliser cette commande.`, ephemeral: true });
		}
	}
};
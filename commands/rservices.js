const { SlashCommandBuilder } = require('@discordjs/builders');

const { GUILD_ID, RECAP_SERVICE_CHAN_ID, MANAGERS_ROLE_ID } = require('../config.json');

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
		.setName('rservices')
		.setDescription("Reset les temps et nombre de services de la semaine."),
	async execute(interaction) {
		if (interaction.guildId == GUILD_ID && roleIsAllowed(interaction.guild.members.cache.get(interaction.user.id).roles)) {
			const channel = interaction.guild.channels.cache.get(RECAP_SERVICE_CHAN_ID);
			
			channel.send("!rservices")
			return interaction.reply({ content: `Tu as reset les temps et nombre de services de la semaine.`, ephemeral: true });
		} else {
			return interaction.reply({ content: `Tu n'as pas l'autorisation pour utiliser cette commande.`, ephemeral: true });
		}
	}
};
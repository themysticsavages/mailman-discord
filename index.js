const Discord = require('discord.js')
const config = require('./config.json')
const prefix = require('discord-prefix')
const sqlite3 = require('sqlite3').verbose()

const bot = new Discord.Client()
const db = new sqlite3.Database('mail.db', sqlite3.OPEN_CREATE | sqlite3.OPEN_READWRITE)

db.run('CREATE TABLE IF NOT EXISTS data(guild, channel)')

bot.on('ready', () => {
    console.log('Mailman is logged on and ready!')
    bot.user.setPresence({
        status: 'online',
        activity: {
            name: 'm!help',
            type: 'LISTENING',
    }})
})

bot.on('message', (message) => {
    if (!message.guild) return
    let guildPrefix = prefix.getPrefix(message.guild.id)
    if (!guildPrefix) guildPrefix = 'm!'
    let args = message.content.slice(guildPrefix.length).split(' ')
    const cmd = args[0].toLowerCase()

    if (message.content === '<!@'+bot.user.id+'>') message.channel.send('The current prefix in this server is `'+guildPrefix+'`')
    if (cmd === 'ping') message.channel.send(`:ping_pong: Pong! API latency is ${bot.ws.ping} ms!`)
    if (cmd === 'help') {
        const embed = new Discord.MessageEmbed()
            .setTitle('Help')
            .setDescription('Server prefix: `'+guildPrefix+'`')
            .addFields(
                { name: 'General', value: '`help`, `ping`, `prefix`, `setup`', inline: true },
                { name: 'Fun', value: '`mail`, `poll`', inline: true },
            )
            .setFooter(`Requested by ${message.author.username}`)
            .setTimestamp()
        message.channel.send(embed)
    }
    if (cmd === 'prefix') {
        if (message.member.hasPermission('MANAGE_GUILD')) {
            if (!args[1]) {
                message.reply("You didn't add a prefix!")
            } else {
                prefix.setPrefix(args[1], message.guild.id)
                message.channel.send('☑ The prefix for me in this server is now `'+args[1]+'`')
            }
        }
    }
    if (cmd === 'setup') {
        if (message.member.hasPermission('MANAGE_GUILD')) {
            if (!message.mentions.channels) {
                message.reply('You need to mention a channel!')
            } else {
                try {
                    const channel = message.mentions.channels.first().toString().replace('<#', '').replace('>', '')
                db.run(`INSERT OR IGNORE INTO data(guild, channel) VALUES("${message.guild.id}", "${channel}")`, function(err, row) { message.channel.send('☑ Cool! I will now send messages in <#'+channel+'>. To remove this configuration run `'+guildPrefix+'setup.rm`') })
                } catch (err) {
                    message.reply('That is not a proper channel mention!')
                }
        }
      }
    }
    if (cmd === 'setup.rm') {
        if (message.member.hasPermission('MANAGE_GUILD')) {
            db.run(`DELETE from data WHERE guild = "${message.guild.id}"`)
            message.channel.send('☑ Configuration removed successfully! You can now configure a new one.')
        }
    }
    if (cmd === 'mail') {
        var rm = args.shift()
        if (!args[1]) {
            message.reply('You need some kind of message!')
        } else {
            db.all('SELECT * from data', [], (err, rows) => {
                rows.forEach((row) => {
                    if (row.guild === message.guild.id) {
                        const embed = new Discord.MessageEmbed()
                            .setTitle('New message!')
                            .setAuthor(message.author.tag, message.author.displayAvatarURL())
                            .setDescription(args.join(' '))
                            .setTimestamp()
                        bot.channels.cache.get(row.channel).send(embed)
                    }
                })
            })
        }
    }
    if (cmd === 'poll') {
        var rm = args.shift()
        if (!args[1]) {
            message.reply('You need a message ID!')
        } else {
            db.all('SELECT * from data', [], (err, rows) => {
                rows.forEach((row) => {
                    if (row.guild === message.guild.id) {
                        const embed = new Discord.MessageEmbed()
                            .setTitle('New poll!')
                            .setAuthor(message.author.tag, message.author.displayAvatarURL())
                            .setDescription(args.join(' '))
                            .setTimestamp()
                        bot.channels.cache.get(row.channel).send(embed)
                        message.client.channels.fetch(row.channel).then((channel) => {
                            channel.messages.fetch({ limit: 1 }).then((messages) => {
                                let msg = messages.first()
                                msg.react('✅')
                                msg.react('❎')
                            })
                        })
                    }
                })
            })
        }
    }
})

bot.login(config.TOKEN)
// Import
var lo_Discord = require('discord.js');
var lo_fs = require('fs');
var lo_path = require('path');

// Reprise du token
var ls_token = "Votre token";
var ls_filePath = lo_path.join(__dirname, 'token.txt');
//_BUFFER = getToken('token.txt');
getToken('token.txt');

function getToken(relPath) {
    ls_token = lo_fs.readFileSync(relPath,{ encoding: 'utf8' });
}

// Création d'une instance d'un client Discord
var lo_bot = new lo_Discord.Client({autoReconnect: true});

// Event gérés par le bot
const la_events = {
    MESSAGE_REACTION_ADD: 'messageReactionAdd',
    MESSAGE_REACTION_REMOVE: 'messageReactionRemove'
};

// Préfixe pour les commandes
const ls_prefix = "lg/"

// Version du bot
const ls_version = "1.0";

// Activation du mode DEBUG
var lb_debugMode = true;

// Aide pour le bot
var ls_helpText = "```Liste des commandes\n";
ls_helpText += " - " + ls_prefix + "help  Affiche ce message d'aide\n";
ls_helpText += " - " + ls_prefix + "version  Affiche les informations de version du bot\n";
ls_helpText += " - " + ls_prefix + "debug  Active ou désactive le mode débug.\n";
ls_helpText += "   Syntaxe : " + ls_prefix + "debug true|false";
ls_helpText += "   Debug activé : " + lb_debugMode + "\n";
ls_helpText += "```";

// Maître du jeu
var lo_gameMaster = null;

lo_bot.on('ready', () => {
    console.log(new Date() + ' : Logged in as '+ lo_bot.user.tag);
});

// En cas d'erreur quelquonque
lo_bot.on('error', po_error => {
    // On l'affiche
    console.error(new Date() + ' : ' + po_error.message);
});

lo_bot.login(ls_token);

lo_bot.on('message', po_message => {
    // Contrôles de l'auteur du message
    if (po_message.author.bot) return;

    // Récupération de la commande et du préfixe
    if (po_message.content.startsWith(ls_prefix)) {
        fs_commande = po_message.content.replace(ls_prefix, '');
        // fs_commandePrefixe = fs_commande.split(' ', 1);
    } 
    else {
        return;
    }

    switch (fs_commande) {
        case 'distribuerCartes':
            po_message.channel.members.forEach(fo_member => {
                if (!fo_member.user.bot) {
                    fct_envoyerMessageCarte(fo_member.user);
                }
            });
            break;
        
        case 'addGameMaster':
            if (lo_gameMaster == null) lo_gameMaster = po_message.author;
            po_message.channel.send('Maître du jeu ajouté !');
            break;

        case 'deleteGameMaster':
            if (po_message.author == lo_gameMaster) {
                lo_gameMaster = null;
                po_message.channel.send('Maître du jeu supprimé !');
            }
            break;
    
        default:
            po_message.
            break;
    }

    if (po_message.content === 'test') {
        fct_envoyerMessageCarte(po_message.author);
    }
});

function fct_envoyerMessageCarte(po_user) {
    po_user.send('Pong')
        .then(
            lo_gameMaster.send('Carte envoyée à ' + po_user.username)
        )
        .catch(
            console.error()
        );
}

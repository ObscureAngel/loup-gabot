// Import
var lo_Discord = require('discord.js');
var lo_fs = require('fs');
var lo_path = require('path');
var lo_mysql = require('mysql');

// Reprise du token
var ls_token = fct_getToken('token.txt');

function fct_getToken(relPath) {
    return lo_fs.readFileSync(relPath,{ encoding: 'utf8' });
}

// Création d'une instance d'un client Discord
var lo_bot = new lo_Discord.Client({autoReconnect: true});

// Création d'une connexion à la bdd
var lo_connexionLoupGabot = lo_mysql.createConnection({
    host : "localhost",
    user : "root",
    password : ""
});

lo_connexionLoupGabot.connect(function(lo_erreur) {
    if (lo_erreur) {
        console.error('Erreur lors de la connexion à la BDD');
        return;
    }
    
    console.log('Connecté au serveur MySQL');

    lo_connexionLoupGabot.query('USE loupGabot', function(lo_erreur, lo_ligne) {
        if (lo_erreur == undefined) {
            console.log('Base connectée');
        }
        else {
            lo_connexionLoupGabot.query('CREATE DATABASE loupGabot');
            lo_connexionLoupGabot.query('USE loupGabot');
        }
    });
});

// Event gérés par le bot
const la_events = {
    MESSAGE_REACTION_ADD: 'messageReactionAdd',
    MESSAGE_REACTION_REMOVE: 'messageReactionRemove'
};

// Préfixe pour les commandes
const ls_prefix = "lg/"

// Version du bot
const ls_version = "1.0";
const li_numeroVersion = 1;

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

lo_bot.login(ls_token);

lo_bot.on('ready', () => {
    console.log(new Date() + ' : Logged in as '+ lo_bot.user.tag);

    // Placer en dessous la création et les changements de structure de la base
    fa_structureBaseOrigine = [
        "CREATE TABLE lg_carte (bi_idCarte INT PRIMARY KEY AUTO_INCREMENT, bs_nomCarte TEXT, bs_descriptionCarte TEXT, bi_clefRole INT)",
        "CREATE TABLE lg_role (bi_idRole INT PRIMARY KEY AUTO_INCREMENT, bs_nomRole TEXT, bs_descriptionRole TEXT, bi_snowflakeRole TEXT)",
        "CREATE TABLE lg_version (bi_numeroVersion INT)",
        "INSERT INTO lg_version VALUES (" + li_numeroVersion + ")"
    ];

    fa_structureBaseChangement = [
        "UPDATE lg_version SET bi_numeroVersion = " + li_numeroVersion
    ];
    
    lo_connexionLoupGabot.query("SELECT bi_numeroVersion FROM lg_version", function (lo_erreur, lo_ligne) {
        if (lo_ligne == undefined) {
            fa_structureBaseOrigine.forEach(fs_requete => {
                lo_connexionLoupGabot.query(fs_requete);
            });
            console.log('Base crée');
        }
        else {
            if(lo_ligne[0].bi_numeroVersion != li_numeroVersion) {
                fa_structureBaseChangement.forEach(fs_requete => {
                    lo_connexionLoupGabot.query(fs_requete); 
                });
                console.log('Base mise à jour');
            }
        }
    });
});

// En cas d'erreur quelquonque
lo_bot.on('error', po_error => {
    // On l'affiche
    console.error(new Date() + ' : ' + po_error.message);
});

lo_bot.on('message', po_message => {
    po_carte = {
        ls_nomCarte: 'Loup-Garou'
    }

    // Contrôles de l'auteur du message
    if (po_message.author.bot) return;

    if (po_message.content === 'test') {
        
    }

    // Récupération de la commande et du préfixe
    if (po_message.content.startsWith(ls_prefix)) {
        fs_commande = po_message.content.replace(ls_prefix, '');
        fa_commandePrefixe = fs_commande.split(' ', 1);
    } 
    else {
        return;
    }

    switch (fa_commandePrefixe[0]) {
        case 'aide':
            po_message.reply(
                'Loup Gabot | Aide du bot'
            );
            break;
        case 'distribuerCartes':
            po_message.channel.members.forEach(fo_member => {
                if (!fo_member.user.bot) {
                    fct_envoyerMessageCarte(fo_member.user, po_carte);
                }
            });
            po_message.channel.send(
                'Toutes les cartes ont été envoyées'
            );
            break;
        
        case 'ajouterCarte':
            // Je retire le préfixe et je récupère le contenu de la carte dans la commande
            fs_commandeAjouterCarte = fs_commande.split('ajouterCarte')[1].trim();
            fs_commandeAjouterCarteContenu = fs_commandeAjouterCarte.split('--');
            fs_nomCarte = fs_commandeAjouterCarteContenu[1].split('nom:')[1].trim();
            fs_descriptionCarte = fs_commandeAjouterCarteContenu[2].split('desc:')[1].trim();
            
            fct_enregistrerNouvelleCarte(fs_nomCarte, fs_descriptionCarte)
                .then(function(po_reponse) {
                    if (po_reponse) {
                        po_message.channel.send('Carte ajoutée !');
                    }
                    else {
                        po_message.channel.send('Une erreur est survenue, la carte n\'a pas été ajoutée...');
                    }
                });
            break;

        case 'ajouterGameMaster':
            if (lo_gameMaster == null) lo_gameMaster = po_message.author;
            po_message.channel.send('Maître du jeu ajouté !');
            break;

        case 'supprimerGameMaster':
            if (po_message.author == lo_gameMaster) {
                lo_gameMaster = null;
                po_message.channel.send('Maître du jeu supprimé !');
            }
            break;
    
        default:
            po_message.reply(
                'Mauvaise commande ! Essaye lg/aide pour voir l\'aide'
            );
            break;
    }
});

function fct_envoyerMessageCarte(po_user, po_carte) {
    po_user.send(po_carte.ls_nomCarte)
        .then(
            lo_gameMaster.send('Carte ' + po_carte.ls_nomCarte + ' envoyée à ' + po_user.username)
        );
}

function fct_enregistrerNouvelleCarte(ps_nomCarte, ps_descriptionCarte) {
    ps_nomCarte = ps_nomCarte.toUpperCase();
    
    return new Promise(function (resolve, reject) {
        fct_isPresenteCarte(ps_nomCarte)
            .then(function (po_reponse) {
                if (!po_reponse) {
                    
                    fs_req = 'INSERT INTO lg_carte (bs_nomCarte, bs_descriptionCarte) VALUES (?, ?)';
                    fa_parametre = [ps_nomCarte, ps_descriptionCarte]
                    fs_req = lo_mysql.format(fs_req, fa_parametre);

                    lo_connexionLoupGabot.query(fs_req, function (po_erreur, po_resultat) {
                        if (po_erreur == undefined) {
                            resolve(true);
                        }
                        else {
                            resolve(false);
                        }
                    });
                }
                else {
                    resolve(false);
                }
            });
    });
}

function fct_isPresenteCarte(ps_nomCarte) {
    return new Promise(function (resolve, reject) {
        fs_req = 'SELECT bi_idCarte FROM lg_carte WHERE bs_nomCarte LIKE ?';
        fa_parametre = [ps_nomCarte];
        fs_req = lo_mysql.format(fs_req, fa_parametre);
        
        fo_req = lo_connexionLoupGabot.query(fs_req, function (po_erreur, po_resultat) {
            if (po_resultat[0] == undefined) {
                resolve(false);
            }
            else {
                resolve(true);
            }
        });
    });
}

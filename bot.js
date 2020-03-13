// Import
const lo_discord = require('discord.js');
//const lo_commando = require('discord.js-commando');
const lo_fs = require('fs');
const lo_path = require('path');
const lo_mysql = require('mysql');

// Reprise du token
var ls_token = fct_getToken('token.txt');

function fct_getToken(relPath) {
    return lo_fs.readFileSync(relPath,{ encoding: 'utf8' });
}

// Création d'une instance d'un client Discord
var lo_bot = new lo_discord.Client({autoReconnect: true});

//var lo_commandeClient = new lo_commando.Client({owner: '341645728260685824'});
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
const li_numeroVersion = 2;

// Activation du mode DEBUG
var lb_debugMode = true;

// Aide pour le bot
var ls_helpText = "```Liste des commandes\n";
ls_helpText += " - " + ls_prefix + "aide  Affiche ce message d'aide\n";
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
        "CREATE TABLE lg_role (bi_idRole INT PRIMARY KEY AUTO_INCREMENT, bs_nomRole TEXT, bs_descriptionRole TEXT, bs_snowflakeRole TEXT)",
        "CREATE TABLE lg_canal (bi_idCanal INT PRIMARY KEY AUTO_INCREMENT, bs_nomCanal TEXT, bs_typeCanal TEXT, bs_snowflakeCanal TEXT, bs_snowflakeServeur TEXT)",
        "CREATE TABLE lg_version (bi_numeroVersion INT)",
        "INSERT INTO lg_version VALUES (" + li_numeroVersion + ")"
    ];

    fa_structureBaseChangement = [
        "UPDATE lg_version SET bi_numeroVersion = " + li_numeroVersion,
        "ALTER TABLE lg_role CHANGE bi_snowflakeRole bs_snowflakeRole TEXT",
        "CREATE TABLE lg_canal (bi_idCanal INT PRIMARY KEY AUTO_INCREMENT, bs_nomCanal TEXT, bs_typeCanal TEXT, bs_snowflakeCanal TEXT, bs_snowflakeServeur TEXT)",
        "ALTER TABLE lg_carte ADD bb_isDistribuable TINYINT(1) DEFAULT 1"

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
        fct_getCarteAJouer_a()
            .then(function (po_reponse) {
                if (po_reponse) {
                    po_reponse.forEach(po_carte => {
                        po_message.author.send(po_carte.ls_nomCarte + " : " + po_carte.ls_descriptionCarte);
                    });
                }
            })
            .catch(function (po_rejection) {
                if (po_rejection) {
                    console.log(po_rejection);
                }
            });
    }

    // Récupération de la commande
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
            if (po_message.author == lo_gameMaster) {

                fct_chargerCanalVocal();
                fa_membres = po_message.channel.members;

                fct_getCarteAJouer_a()
                    .then(function(po_reponse) {
                        if(po_reponse) {
                            po_reponse = fct_shuffle(po_reponse);
                            var fi_compteur = 0;
                            fa_membres.forEach(fo_member => {
                                if (!fo_member.user.bot && fo_member.user != lo_gameMaster) {
                                    po_carte = po_reponse[fi_compteur];
                                    fct_envoyerMessageCarte(fo_member.user, po_carte);
                                    fi_compteur++;
                                }
                            });
                            lo_gameMaster.send(
                                'Toutes les cartes ont été envoyées'
                            );
                        }
                    })
                    .catch(function(po_rejection) {
                        if(po_rejection) {
                            po_message.channel.send('Une erreur est survenue.');
                            console.log(po_rejection);
                            
                        }
                    });
                
            }
            else {
                po_message.reply('Le maître du jeu n\'est pas défini, vous ne pouvez pas lancer de partie.');
            }
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

        case 'ajouterMaitre':
            if (lo_gameMaster == null) lo_gameMaster = po_message.author;
            po_message.channel.send('Maître du jeu ajouté !');
            break;

        case 'supprimerMaitre':
            if (po_message.author == lo_gameMaster) {
                lo_gameMaster = null;
                po_message.channel.send('Maître du jeu supprimé !');
            }
            break;
        
        case 'ajouterCanalVocal':
            fs_commandeAjouterCanal = fs_commande.split('ajouterCanalVocal')[1].trim();
            fs_commandeAjouterCanalContenu = fs_commandeAjouterCanal.split('--');
            fs_nomCanal = fs_commandeAjouterCanalContenu[1].split('canal:')[1].trim();
            console.log(po_message.guild.channels.find(fo_guildChannel => fo_guildChannel.name = fs_nomCanal));

            // recherche du canal correspondant au nom, utiliser variable globale
    
        case 'ajouterCanalText':
            fs_commandeAjouterCanal = fs_commande.split('ajouterCanalText')[1].trim();
            fs_commandeAjouterCanalContenu = fs_commandeAjouterCanal.split('--');
            fs_nomCanal = fs_commandeAjouterCanalContenu[1].split('canal:')[1].trim();
            fs_typeCanal = fs_commandeAjouterCanalContenu[2].split('type:')[1].trim();
            fa_typeCanal = [
                'village',
                'loup'
            ];

            if (fa_typeCanal.indexOf(fs_typeCanal) >= 0) {
                fct_enregistrerCanal()
                    .then(function (po_reponse) {
                        if (po_reponse) {
                            po_message.channel.send('Canal ajouté !');
                        }
                        else {
                            po_message.channel.send('Une erreur est survenue, le canal n\'a pas été ajouté...');
                        }
                    });
            }
            break;

        default:
            po_message.reply(
                'Mauvaise commande ! Essaye lg/aide pour voir l\'aide'
            );
            break;
    }
});

function fct_envoyerMessageCarte (po_user, po_carte) {
    po_user.send('Tu as eu la carte ' + po_carte.ls_nomCarte + ' ! ' + po_carte.ls_descriptionCarte)
        .then(
            lo_gameMaster.send('Carte ' + po_carte.ls_nomCarte + ' envoyée à ' + po_user.username)
        );
}

function fct_enregistrerNouvelleCarte (ps_nomCarte, ps_descriptionCarte) {
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

function fct_isPresenteCarte (ps_nomCarte) {
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

function fct_enregistrerCanal (ps_nomCanal, ps_typeCanal, po_serveur) {
    return new Promise(function (resolve, reject) {

    });
}

function fct_getCarteAJouer_a () {
    return new Promise(function (resolve, reject) {
        fs_req = 'SELECT * FROM lg_carte WHERE bb_isDistribuable = 1';
        var fa_carte = [];

        fo_req = lo_connexionLoupGabot.query(fs_req, function (po_erreur, po_resultat) {
            if (po_resultat[0] == undefined) {
                resolve('Aucune carte n\'a été trouvé');
            }
            else {
                fi_compteur = 0;
                po_resultat.forEach(po_ligne => {
                    fa_carte[fi_compteur] = {
                        ls_nomCarte: po_ligne['bs_nomCarte'],
                        ls_descriptionCarte: po_ligne['bs_descriptionCarte'] 
                    };
                    fi_compteur++;
                });
                
                resolve(fa_carte);
            }
        });
    });
}

function fct_shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;
  
    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
  
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;
  
      // And swap it with the current element.
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }
  
    return array;
}

function fct_chargerCanalVocal(fo_serveur) {

}
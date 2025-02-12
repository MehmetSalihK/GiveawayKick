let currentChannelId = null;
let lastMessageId = null;

document.getElementById('search-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const slug = document.getElementById('channel-slug').value;
    await initializeChat(slug);
});

async function initializeChat(slug) {
    try {
        // Première requête pour obtenir l'ID du canal
        const channelResponse = await fetch(`https://kick.com/api/v2/channels/${slug}`);
        const channelData = await channelResponse.json();
        
        // Utiliser directement l'ID du canal depuis la réponse
        currentChannelId = channelData.id;
        console.log('Channel ID:', currentChannelId);
        
        // Vider le conteneur de chat
        const chatContainer = document.getElementById('chat-container');
        chatContainer.innerHTML = '';
        
        // Charger les messages initiaux
        await loadMessages();
        
        // Mettre en place la mise à jour automatique
        startMessagePolling();
    } catch (error) {
        console.error('Erreur lors de l\'initialisation du chat:', error);
    }
}

async function loadMessages() {
    if (!currentChannelId) return;

    try {
        const response = await fetch(`https://kick.com/api/v2/channels/${currentChannelId}/messages`);
        const data = await response.json();
        
        if (data.status.code === 200 && data.data.messages) {
            const chatContainer = document.getElementById('chat-container');
            
            // Prendre seulement les 15 derniers messages
            const latestMessages = data.data.messages.slice(0, 15);
            
            // Vider le conteneur de chat
            chatContainer.innerHTML = '';
            
            // Afficher les messages dans l'ordre inverse (du plus récent au plus ancien)
            latestMessages.forEach(message => {
                const messageElement = createMessageElement(message);
                chatContainer.appendChild(messageElement);
            });
            
            // Mettre à jour le dernier ID de message
            if (data.data.messages.length > 0) {
                lastMessageId = data.data.messages[0].id;
            }
        }
    } catch (error) {
        console.error('Erreur lors du chargement des messages:', error);
    }
}

function createMessageElement(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    
    // Ajouter les badges si présents
    let badgesHTML = '';
    if (message.sender.identity && message.sender.identity.badges) {
        message.sender.identity.badges.forEach(badge => {
            if (badge.active) { // Ne montrer que les badges actifs
                badgesHTML += `<span class="badge badge-${badge.type}" title="${badge.text}"></span>`;
            }
        });
    }
    
    // Définir la couleur du nom d'utilisateur
    const usernameColor = message.sender.identity.color || '#4CAF50';
    
    messageDiv.innerHTML = `
        <div class="message-header">
            ${badgesHTML}
            <span class="username" style="color: ${usernameColor}">${message.sender.username}</span>
        </div>
        <div class="message-content">
            <span class="content">${message.content}</span>
        </div>
    `;
    
    return messageDiv;
}

function startMessagePolling() {
    // Arrêter tout polling existant
    if (window.pollInterval) {
        clearInterval(window.pollInterval);
    }
    
    // Démarrer un nouveau polling
    window.pollInterval = setInterval(async () => {
        if (currentChannelId) {
            await loadMessages();
        }
    }, 2000); // Vérifier les nouveaux messages toutes les 2 secondes
}

// Nettoyer l'intervalle quand l'utilisateur quitte la page
window.addEventListener('beforeunload', () => {
    if (window.pollInterval) {
        clearInterval(window.pollInterval);
    }
});

// Script pour la fonctionnalité du giveaway
document.addEventListener('DOMContentLoaded', () => {
    const commandInput = document.getElementById('command-input');
    const durationInput = document.getElementById('duration-input');
    const startGiveawayButton = document.getElementById('start-giveaway');
    const cancelGiveawayButton = document.getElementById('cancel-giveaway');
    const defineWinnerButton = document.getElementById('define-winner');
    const participantsList = document.getElementById('participants-list');
    const resultsDisplay = document.getElementById('results-display');
    
    let giveawayActive = false;
    let participants = [];
    let countdownInterval = null;
    let command = '';

    // Cacher le bouton d'annulation au départ
    cancelGiveawayButton.classList.add('hidden');
    
    // Démarrer le tirage
    startGiveawayButton.addEventListener('click', () => {
        command = commandInput.value.trim();
        if (command) {
            // Désactiver le champ de commande
            commandInput.disabled = true;
            
            // Cacher le bouton démarrer et montrer le bouton annuler
            startGiveawayButton.classList.add('hidden');
            cancelGiveawayButton.classList.remove('hidden');
            
            giveawayActive = true;
            participants = [];
            participantsList.innerHTML = '';
            resultsDisplay.innerHTML = 'Les participants peuvent maintenant utiliser la commande !';
            
            // Commencer à collecter les participants
            startCollectingParticipants();
        } else {
            resultsDisplay.innerHTML = 'Veuillez définir la commande.';
        }
    });

    // Annuler le tirage
    cancelGiveawayButton.addEventListener('click', () => {
        endGiveaway();
    });

    // Définir le gagnant avec compte à rebours
    defineWinnerButton.addEventListener('click', () => {
        if (!giveawayActive) {
            resultsDisplay.innerHTML = 'Veuillez d\'abord démarrer le tirage.';
            return;
        }

        const duration = parseInt(durationInput.value, 10);
        let timeLeft = duration;

        // Désactiver le bouton pendant le compte à rebours
        defineWinnerButton.disabled = true;
        
        // Démarrer le compte à rebours
        resultsDisplay.innerHTML = `Tirage du gagnant dans : ${timeLeft} secondes`;
        countdownInterval = setInterval(() => {
            timeLeft--;
            resultsDisplay.innerHTML = `Tirage du gagnant dans : ${timeLeft} secondes`;
            
            if (timeLeft <= 0) {
                clearInterval(countdownInterval);
                selectWinner();
            }
        }, 1000);
    });

    function selectWinner() {
        clearInterval(countdownInterval);
        defineWinnerButton.disabled = false;

        if (participants.length > 0) {
            const winner = participants[Math.floor(Math.random() * participants.length)];
            resultsDisplay.innerHTML = `Le gagnant est : <strong>${winner}</strong>`;
        } else {
            resultsDisplay.innerHTML = 'Aucun participant pour définir un gagnant.';
        }
    }

    function endGiveaway() {
        // Arrêter le compte à rebours s'il est en cours
        clearInterval(countdownInterval);
        
        // Réactiver les contrôles
        commandInput.disabled = false;
        defineWinnerButton.disabled = false;
        
        // Réinitialiser l'interface
        cancelGiveawayButton.classList.add('hidden');
        startGiveawayButton.classList.remove('hidden');
        
        giveawayActive = false;
        participants = [];
        participantsList.innerHTML = '';
        resultsDisplay.innerHTML = 'Tirage annulé.';
    }

    function startCollectingParticipants() {
        // Vérifier les nouveaux messages toutes les 2 secondes
        const collectInterval = setInterval(() => {
            if (!giveawayActive) {
                clearInterval(collectInterval);
                return;
            }

            fetch(`https://kick.com/api/v2/channels/${currentChannelId}/messages`)
                .then(response => response.json())
                .then(data => {
                    if (data.status.code === 200 && data.data.messages) {
                        const newParticipants = data.data.messages
                            .filter(msg => msg.content.includes(command))
                            .map(msg => msg.sender.username)
                            .filter(username => !participants.includes(username));

                        if (newParticipants.length > 0) {
                            participants.push(...newParticipants);
                            updateParticipantsList();
                        }
                    }
                })
                .catch(error => console.error('Erreur:', error));
        }, 2000);
    }

    function updateParticipantsList() {
        participantsList.innerHTML = participants.map(user => `<li>${user}</li>`).join('');
    }

    document.getElementById('search-form').addEventListener('submit', function(event) {
        event.preventDefault(); // Empêche le rechargement de la page

        const slug = document.getElementById('channel-slug').value;

        fetch(`https://kick.com/api/v2/channels/${slug}`)
            .then(response => response.json())
            .then(data => {
                currentChannelId = data.id; // Stocke l'ID du canal pour l'utiliser dans la récupération des messages
            })
            .catch(error => {
                console.error('Erreur lors de la récupération des informations du canal:', error);
            });
    });
});

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
            commandInput.disabled = true;
            startGiveawayButton.classList.add('hidden');
            cancelGiveawayButton.classList.remove('hidden');
            
            giveawayActive = true;
            participants = [];
            participantsList.innerHTML = '';
            
            showNotification('Les participants peuvent maintenant utiliser la commande !');
            
            startCollectingParticipants();
        } else {
            showNotification('Veuillez définir la commande.');
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

        // Créer l'overlay en plein écran
        const overlay = document.createElement('div');
        overlay.className = 'fullscreen-overlay';
        document.body.appendChild(overlay);

        // Désactiver le bouton pendant le compte à rebours
        defineWinnerButton.disabled = true;
        
        // Démarrer le compte à rebours
        overlay.innerHTML = `<div class="countdown">${timeLeft}</div>`;
        countdownInterval = setInterval(() => {
            timeLeft--;
            overlay.innerHTML = `<div class="countdown">${timeLeft}</div>`;
            
            if (timeLeft <= 0) {
                clearInterval(countdownInterval);
                selectWinner(overlay);
            }
        }, 1000);
    });

    function selectWinner(overlay) {
        clearInterval(countdownInterval);

        if (participants.length > 0) {
            const winner = participants[Math.floor(Math.random() * participants.length)];
            
            if (animationEnabled) {
                // Version avec animation
                const closeButton = document.createElement('button');
                closeButton.className = 'close-button';
                
                overlay.innerHTML = `
                    <div class="winner-announcement">
                        <div class="winner-label">Le gagnant est</div>
                        <div class="winner-name animate-pop">${winner}</div>
                    </div>
                `;
                
                const announcement = overlay.querySelector('.winner-announcement');
                announcement.appendChild(closeButton);
                
                launchConfetti();
                
                closeButton.addEventListener('click', () => {
                    overlay.remove();
                    defineWinnerButton.disabled = false;
                    resultsDisplay.innerHTML = `Le gagnant est : <strong>${winner}</strong>`;
                });
            } else {
                // Version sans animation
                overlay.remove();
                defineWinnerButton.disabled = false;
                resultsDisplay.innerHTML = `Le gagnant est : <strong>${winner}</strong>`;
                showNotification(`Le gagnant est : ${winner}`);
            }
        } else {
            overlay.remove();
            resultsDisplay.innerHTML = 'Aucun participant pour définir un gagnant.';
            defineWinnerButton.disabled = false;
        }
    }

    // Fonction pour lancer les confettis
    function launchConfetti() {
        const count = 200;
        const defaults = {
            origin: { y: 0.7 },
            colors: ['#ff0000', '#ffd700', '#00ff00', '#0000ff', '#ff00ff']
        };

        function fire(particleRatio, opts) {
            confetti({
                ...defaults,
                ...opts,
                particleCount: Math.floor(count * particleRatio)
            });
        }

        // Explosion initiale de confettis
        fire(0.25, {
            spread: 26,
            startVelocity: 55,
        });

        fire(0.2, {
            spread: 60,
        });

        fire(0.35, {
            spread: 100,
            decay: 0.91,
            scalar: 0.8
        });

        fire(0.1, {
            spread: 120,
            startVelocity: 25,
            decay: 0.92,
            scalar: 1.2
        });

        fire(0.1, {
            spread: 120,
            startVelocity: 45,
        });
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
        
        // Utiliser la notification au lieu du resultsDisplay
        showNotification('Tirage annulé.');
    }

    // Ajouter les sélecteurs pour le mode subscriber
    const giveawayControls = document.getElementById('giveaway-controls');
    const subscriberModeDiv = document.createElement('div');
    subscriberModeDiv.innerHTML = `
        <div class="subscriber-controls">
            <label class="checkbox-container">
                <input type="checkbox" id="subscriber-only">
                <span class="checkmark"></span>
                Mode Subscriber uniquement
            </label>
            <select id="subscriber-months" class="subscriber-select" disabled>
                <option value="0">Tous les subscribers</option>
                <option value="2">2+ mois</option>
                <option value="3">3+ mois</option>
                <option value="6">6+ mois</option>
                <option value="12">1+ an</option>
                <option value="18">1.5+ ans</option>
                <option value="24">2+ ans</option>
                <option value="30">2.5+ ans</option>
                <option value="36">3+ ans</option>
                <option value="42">3.5+ ans</option>
                <option value="48">4+ ans</option>
                <option value="54">4.5+ ans</option>
                <option value="60">5+ ans</option>
                <option value="66">5.5+ ans</option>
                <option value="72">6+ ans</option>
                <option value="78">6.5+ ans</option>
                <option value="84">7+ ans</option>
                <option value="90">7.5+ ans</option>
                <option value="96">8+ ans</option>
            </select>
        </div>
    `;
    giveawayControls.insertBefore(subscriberModeDiv, commandInput);

    let subscriberOnly = false;
    let minSubscriberMonths = 0;
    const subscriberCheckbox = document.getElementById('subscriber-only');
    const subscriberMonthsSelect = document.getElementById('subscriber-months');

    subscriberCheckbox.addEventListener('change', (e) => {
        subscriberOnly = e.target.checked;
        subscriberMonthsSelect.disabled = !e.target.checked;
    });

    subscriberMonthsSelect.addEventListener('change', (e) => {
        minSubscriberMonths = parseInt(e.target.value, 10);
    });

    function startCollectingParticipants() {
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
                            .filter(msg => {
                                // Vérifier si le message contient la commande
                                const hasCommand = msg.content.includes(command);
                                
                                // Vérifier si l'utilisateur est subscriber avec l'ancienneté requise
                                const subscriberBadge = msg.sender.identity.badges?.find(
                                    badge => badge.type === 'subscriber' && badge.active
                                );
                                
                                const hasRequiredMonths = subscriberBadge && 
                                    (!minSubscriberMonths || subscriberBadge.count >= minSubscriberMonths);
                                
                                return hasCommand && (!subscriberOnly || hasRequiredMonths);
                            })
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

    // Dans la section DOMContentLoaded, après la création des contrôles subscriber
    // Ajouter le switch pour l'animation
    const animationControlDiv = document.createElement('div');
    animationControlDiv.innerHTML = `
        <div class="switch-container">
            <label class="switch">
                <input type="checkbox" id="animation-toggle" checked>
                <span class="slider"></span>
            </label>
            <span class="switch-label">Animation du tirage</span>
        </div>
    `;
    giveawayControls.insertBefore(animationControlDiv, commandInput);

    let animationEnabled = true;
    const animationToggle = document.getElementById('animation-toggle');

    animationToggle.addEventListener('change', (e) => {
        animationEnabled = e.target.checked;
    });
});

// Ajouter cette fonction pour afficher les notifications
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);

    // Supprimer la notification après l'animation
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

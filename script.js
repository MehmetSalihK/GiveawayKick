document.getElementById('search-form').addEventListener('submit', function(event) {
    event.preventDefault(); // Empêche le rechargement de la page

    const slug = document.getElementById('channel-slug').value;
    const chatDiv = document.getElementById('chat-container');

    // Efface les messages précédents
    chatDiv.innerHTML = '';

    // Vérifie si le slug est fourni
    if (!slug) {
        chatDiv.innerHTML = '<p>Veuillez entrer un slug de canal.</p>';
        return;
    }

    // Requête API pour obtenir les informations du canal
    fetch(`https://kick.com/api/v2/channels/${slug}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Canal non trouvé');
            }
            return response.json();
        })
        .then(data => {
            let lastMessageId = null; // Variable pour suivre le dernier message affiché

            // Fonction pour récupérer et afficher les messages du chat
            function fetchChatMessages() {
                fetch(`https://kick.com/api/v2/channels/${data.id}/messages`)
                    .then(response => response.json())
                    .then(responseData => {
                        if (responseData.status.error) {
                            throw new Error('Erreur lors de la récupération des messages');
                        }
                        
                        const messages = responseData.data.messages;

                        // Filtre les nouveaux messages qui n'ont pas encore été affichés
                        const newMessages = lastMessageId ? messages.filter(msg => msg.id > lastMessageId) : messages;

                        if (newMessages.length > 0) {
                            // Met à jour le dernier ID de message
                            lastMessageId = newMessages[newMessages.length - 1].id;

                            let chatHtml = '';
                            newMessages.forEach(message => {
                                const sender = message.sender;
                                const content = message.content;
                                const username = sender.username;
                                const color = sender.identity.color;
                                
                                chatHtml += `
                                    <div class="message">
                                        <span class="username" style="color: ${color};">${username}:</span> ${content}
                                    </div>
                                `;
                            });

                            // Ajoute les nouveaux messages
                            chatDiv.innerHTML += chatHtml;

                            // Défile vers le bas
                            chatDiv.scrollTop = chatDiv.scrollHeight;
                        }
                    })
                    .catch(error => {
                        chatDiv.innerHTML += `<p>Impossible de charger le chat en direct: ${error.message}</p>`;
                    });
            }

            // Initialiser la récupération des messages
            fetchChatMessages();

            // Mettre à jour les messages du chat toutes les 1 seconde (1000 ms) pour un affichage fluide
            const chatUpdateInterval = 1000;
            const chatUpdateTimer = setInterval(fetchChatMessages, chatUpdateInterval);

            // Nettoyer l'intervalle si nécessaire (par exemple lors de la navigation ailleurs)
            window.addEventListener('beforeunload', () => clearInterval(chatUpdateTimer));
        })
        .catch(error => {
            chatDiv.innerHTML = `<p>Erreur: ${error.message}</p>`;
        });
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
    
    let command = '';
    let duration = 10;
    let participants = [];
    let channelId = null;
    let giveawayInterval = null;
    
    // Démarrer le tirage
    startGiveawayButton.addEventListener('click', () => {
        command = commandInput.value.trim();
        duration = parseInt(durationInput.value, 10);

        if (command && channelId) {
            participants = [];
            participantsList.innerHTML = '';
            resultsDisplay.innerHTML = 'Attente des participants...';

            // Start a timer to collect participants
            giveawayInterval = setTimeout(() => {
                fetchMessagesAndUpdateResults();
            }, duration * 1000); // Convert duration to milliseconds
        } else {
            resultsDisplay.innerHTML = 'Veuillez définir la commande et vous assurer que le canal est correctement chargé.';
        }
    });

    // Annuler le tirage
    cancelGiveawayButton.addEventListener('click', () => {
        if (giveawayInterval) {
            clearTimeout(giveawayInterval);
            giveawayInterval = null;
            resultsDisplay.innerHTML = 'Tirage annulé.';
        }
    });

    // Définir le gagnant
    defineWinnerButton.addEventListener('click', () => {
        if (participants.length > 0) {
            const winner = participants[Math.floor(Math.random() * participants.length)];
            resultsDisplay.innerHTML = `Le gagnant est : <strong>${winner}</strong>`;
        } else {
            resultsDisplay.innerHTML = 'Aucun participant pour définir un gagnant.';
        }
    });

    function fetchMessagesAndUpdateResults() {
        fetch(`https://kick.com/api/v2/channels/${channelId}/messages`)
            .then(response => response.json())
            .then(responseData => {
                if (responseData.status.error) {
                    throw new Error('Erreur lors de la récupération des messages');
                }

                participants = responseData.data.messages
                    .filter(msg => msg.content.includes(command))
                    .map(msg => msg.sender.username);
                
                if (participants.length > 0) {
                    updateParticipantsList();
                } else {
                    resultsDisplay.innerHTML = 'Aucun participant pour cette commande.';
                }
            })
            .catch(error => {
                console.error('Erreur lors de la récupération des messages:', error);
                resultsDisplay.innerHTML = 'Erreur lors de la récupération des messages.';
            });
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
                channelId = data.id; // Stocke l'ID du canal pour l'utiliser dans la récupération des messages
            })
            .catch(error => {
                console.error('Erreur lors de la récupération des informations du canal:', error);
            });
    });
});

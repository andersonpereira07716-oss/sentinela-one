document.addEventListener('DOMContentLoaded', () => {
    // ABAS
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const targetPane = document.getElementById(btn.dataset.target);
            targetPane.classList.add('active');

            // Recalcular tamanho do mapa se for a aba Início
            if (btn.dataset.target === 'tab-home' && map) {
                setTimeout(() => map.invalidateSize(), 200);
            }
        });
    });

    // ESTADO DO APLICATIVO
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');

    function updateStatus(state, text) {
        statusDot.className = 'dot ' + state;
        statusText.textContent = text;
    }

    // GEOLOCALIZAÇÃO E MAPA LEAFLET
    const geoStatus = document.getElementById('geo-status');
    const geoCoords = document.getElementById('geo-coords');
    const btnGetLocation = document.getElementById('btn-get-location');
    let lastCoords = null;
    let map = null;
    let marker = null;

    function initMap(lat, lon) {
        const container = document.getElementById('map-container');
        container.innerHTML = ''; // Limpar mensagem inicial

        map = L.map('map-container').setView([lat, lon], 15);

        // Camada do OpenStreetMap com visualização escurecida
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
        }).addTo(map);

        marker = L.marker([lat, lon]).addTo(map)
            .bindPopup('<b>Você está aqui</b><br>Sentinela One Ativo').openPopup();
    }

    function updateMap(lat, lon) {
        if (!map) {
            initMap(lat, lon);
        } else {
            map.setView([lat, lon], 15);
            marker.setLatLng([lat, lon]);
        }
    }

    btnGetLocation.addEventListener('click', () => {
        if (!navigator.geolocation) {
            geoStatus.textContent = "Geolocalização não suportada pelo navegador.";
            return;
        }
        geoStatus.textContent = "Solicitando permissão de GPS...";
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude.toFixed(5);
                const lon = position.coords.longitude.toFixed(5);
                lastCoords = { lat, lon };
                geoCoords.textContent = `Lat: ${lat} | Long: ${lon}`;
                geoStatus.textContent = "Localização obtida em tempo real!";
                
                updateMap(position.coords.latitude, position.coords.longitude);
                addHistory("Localização e mapa atualizados.");
                updateSOSMessage();
            },
            (error) => {
                geoStatus.textContent = "Erro ao obter GPS: " + error.message;
                addHistory("Falha na obtenção de localização.");
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    });

    // JORNADA PROTEGIDA
    const btnStartJourneyTab = document.getElementById('btn-start-journey');
    const btnBeginJourney = document.getElementById('btn-begin-journey');
    const journeyActiveCard = document.getElementById('journey-active-card');
    const currentDest = document.getElementById('current-dest');
    const timerCountdown = document.getElementById('timer-countdown');
    const btnArrive = document.getElementById('btn-arrive');
    const btnCancelJourney = document.getElementById('btn-cancel-journey');
    const btnSafe = document.getElementById('btn-safe');
    
    let journeyTimer = null;
    let timeLeft = 0;

    btnStartJourneyTab.addEventListener('click', () => {
        document.querySelector('[data-target="tab-journey"]').click();
    });

    btnSafe.addEventListener('click', () => {
        if (journeyTimer) {
            clearInterval(journeyTimer);
            journeyActiveCard.classList.add('hidden-card');
        }
        updateStatus('paused', 'Proteção pausada');
        addHistory("Confirmação manual de segurança emitida.");
        alert("Sinal de segurança emitido. Estado atualizado.");
    });

    btnBeginJourney.addEventListener('click', () => {
        const destination = document.getElementById('input-destination').value.trim() || "Destino não informado";
        const durationMinutes = parseInt(document.getElementById('input-duration').value) || 30;
        
        currentDest.textContent = destination;
        timeLeft = durationMinutes * 60;
        
        journeyActiveCard.classList.remove('hidden-card');
        updateStatus('active', 'Em deslocamento');
        addHistory(`Jornada iniciada para: ${destination} (${durationMinutes} min)`);
        startTimer();
    });

    function startTimer() {
        clearInterval(journeyTimer);
        journeyTimer = setInterval(() => {
            if (timeLeft > 0) {
                timeLeft--;
                const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
                const secs = (timeLeft % 60).toString().padStart(2, '0');
                timerCountdown.textContent = `${mins}:${secs}`;
            } else {
                clearInterval(journeyTimer);
                updateStatus('pending', 'Confirmação pendente');
                timerCountdown.textContent = "00:00";
                addHistory("Prazo da jornada expirado! Confirmação pendente.");
                alert("Atenção! O tempo estimado da jornada expirou. Por favor, confirme sua segurança.");
            }
        }, 1000);
    }

    btnArrive.addEventListener('click', () => {
        clearInterval(journeyTimer);
        journeyActiveCard.classList.add('hidden-card');
        updateStatus('paused', 'Proteção pausada');
        addHistory("Jornada concluída com segurança.");
        alert("Que ótimo! Jornada encerrada com segurança.");
    });

    btnCancelJourney.addEventListener('click', () => {
        clearInterval(journeyTimer);
        journeyActiveCard.classList.add('hidden-card');
        updateStatus('paused', 'Proteção pausada');
        addHistory("Jornada cancelada pelo usuário.");
    });

    // CONTATOS DE CONFIANÇA
    const contactForm = document.getElementById('contact-form');
    const contactsList = document.getElementById('contacts-list');
    let contacts = JSON.parse(localStorage.getItem('sentinela_contacts')) || [];

    function renderContacts() {
        if (contacts.length === 0) {
            contactsList.innerHTML = '<p class="text-muted">Nenhum contato cadastrado.</p>';
            return;
        }
        contactsList.innerHTML = '';
        contacts.forEach((c, index) => {
            const div = document.createElement('div');
            div.className = 'contact-item';
            div.innerHTML = `
                <div>
                    <strong>${c.name}</strong> (${c.relation})<br>
                    <span class="text-muted">${c.phone}</span>
                </div>
                <button class="btn btn-outline-danger" style="width: auto; padding: 4px 8px; font-size: 11px;" onclick="removeContact(${index})">Excluir</button>
            `;
            contactsList.appendChild(div);
        });
    }

    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('contact-name').value.trim();
        const phone = document.getElementById('contact-phone').value.trim();
        const relation = document.getElementById('contact-relation').value.trim();

        if (name && phone && relation) {
            contacts.push({ name, phone, relation });
            localStorage.setItem('sentinela_contacts', JSON.stringify(contacts));
            contactForm.reset();
            renderContacts();
            addHistory(`Contato adicionado: ${name}`);
        }
    });

    window.removeContact = function(index) {
        const removed = contacts.splice(index, 1);
        localStorage.setItem('sentinela_contacts', JSON.stringify(contacts));
        renderContacts();
        addHistory(`Contato removido: ${removed[0].name}`);
    };

    renderContacts();

    // BOTÃO DE AJUDA / SOS
    const btnEmergencySos = document.getElementById('btn-emergency-sos');
    const sosMessageBox = document.getElementById('sos-message-box');
    const btnCopySos = document.getElementById('btn-copy-sos');

    btnEmergencySos.addEventListener('click', () => {
        document.querySelector('[data-target="tab-help"]').click();
        updateStatus('danger', 'Alerta de ajuda');
        addHistory("Botão de ajuda acionado pelo usuário.");
    });

    function updateSOSMessage() {
        let msg = "ESTOU EM SITUAÇÃO DE RISCO! Preciso de ajuda urgente.";
        if (lastCoords) {
            msg += ` Minha última localização: https://maps.google.com/?q=${lastCoords.lat},${lastCoords.lon}`;
        }
        sosMessageBox.value = msg;
    }

    btnCopySos.addEventListener('click', () => {
        sosMessageBox.select();
        navigator.clipboard.writeText(sosMessageBox.value)
            .then(() => alert("Mensagem de socorro copiada para a área de transferência!"))
            .catch(() => alert("Erro ao copiar mensagem."));
    });

    updateSOSMessage();

    // HISTÓRICO DE OCORRÊNCIAS
    const historyList = document.getElementById('history-list');
    const btnClearHistory = document.getElementById('btn-clear-history');
    const btnWipeData = document.getElementById('btn-wipe-data');
    let historyLogs = JSON.parse(localStorage.getItem('sentinela_history')) || [];

    function addHistory(action) {
        const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const date = new Date().toLocaleDateString('pt-BR');
        historyLogs.unshift({ text: action, time: `${date} ${time}` });
        if (historyLogs.length > 50) historyLogs.pop();
        localStorage.setItem('sentinela_history', JSON.stringify(historyLogs));
        renderHistory();
    }

    function renderHistory() {
        if (historyLogs.length === 0) {
            historyList.innerHTML = '<p class="text-muted">Nenhum evento registrado.</p>';
            return;
        }
        historyList.innerHTML = '';
        historyLogs.forEach(h => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `<span>${h.text}</span><span class="text-muted">${h.time}</span>`;
            historyList.appendChild(div);
        });
    }

    btnClearHistory.addEventListener('click', () => {
        if (confirm("Deseja limpar todo o histórico?")) {
            historyLogs = [];
            localStorage.removeItem('sentinela_history');
            renderHistory();
        }
    });

    btnWipeData.addEventListener('click', () => {
        if (confirm("ATENÇÃO: Isso apagará todos os contatos e histórico salvos localmente. Deseja prosseguir?")) {
            localStorage.clear();
            contacts = [];
            historyLogs = [];
            renderContacts();
            renderHistory();
            alert("Dados locais excluídos com sucesso.");
        }
    });

    renderHistory();
});

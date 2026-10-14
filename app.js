    function initMap(lat, lon) {
        const container = document.getElementById('map-container');
        // Limpa o container para remover o placeholder
        container.innerHTML = '';

        if (map) {
            map.remove(); // Remove instância anterior se houver
        }

        map = L.map('map-container').setView([lat, lon], 15);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
        }).addTo(map);

        marker = L.marker([lat, lon]).addTo(map)
            .bindPopup('<b>Você está aqui</b><br>Sentinela One Ativo').openPopup();
    }

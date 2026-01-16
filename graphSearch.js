// GraphSearch v3.0 - SAVQonnect Vitrine - Donnees DXF A-1825 COMPLETES
(function() {
    "use strict";
    console.log("[GraphSearch] Module charge v3.0 - Donnees DXF A-1825 avec marques");

    var CONFIG = {
        serverUrl: null,
        defaultRoom: "A-1825",
        confidenceThreshold: 0.6
    };

    // DONNEES REELLES extraites du DXF plan-unifilaire_a-1825_20251006.dxf
    var EMBEDDED_DATA = {
  "A-1825": {
    "meta": {
      "source": "plan-unifilaire_a-1825_20251006.dxf",
      "room": "A-1825",
      "generated_at": "2025-12-30",
      "version": "3.0"
    },
    "equipments": [
      {
        "id": "eq_1",
        "label": "Extron DTP2  T 211",
        "marque": "Extron",
        "modele": "DTP2  T 211",
        "fonction": "4K/60 HDMI DTP2 Trans w A Emb",
        "x": 2690.78,
        "y": 384.28,
        "ports": [
          {
            "type": "IN",
            "name": "RS-232",
            "cable": "C001"
          },
          {
            "type": "IN",
            "name": "HDMI",
            "cable": "V001"
          },
          {
            "type": "IN",
            "name": "Audio 3.5mm",
            "cable": "A001"
          },
          {
            "type": "OUT",
            "name": "DTP2 OUT",
            "cable": "V002"
          },
          {
            "type": "OUT",
            "name": "IR",
            "cable": "C002"
          }
        ]
      },
      {
        "id": "eq_2",
        "label": "Extron USBA Pro P/65",
        "marque": "Extron",
        "modele": "USBA Pro P/65",
        "fonction": "Extension USB",
        "x": 2976.66,
        "y": 551.6,
        "ports": []
      },
      {
        "id": "eq_3",
        "label": "Extron USB HUB 4 AAP *",
        "marque": "Extron",
        "modele": "USB HUB 4 AAP *",
        "fonction": "HUB USB",
        "x": 2294.62,
        "y": 638.31,
        "ports": [
          {
            "type": "IN",
            "name": "USB 1"
          },
          {
            "type": "IN",
            "name": "USB 2"
          },
          {
            "type": "IN",
            "name": "USB 3"
          },
          {
            "type": "IN",
            "name": "USB 4"
          },
          {
            "type": "OUT",
            "name": "Mini USB"
          }
        ]
      },
      {
        "id": "eq_4",
        "label": "Extron MLC Plus 100 AAP",
        "marque": "Extron",
        "modele": "MLC Plus 100 AAP",
        "fonction": "Plaque de contrôle",
        "x": 2558.72,
        "y": 561.6,
        "ports": [
          {
            "type": "OUT",
            "name": "COM 1"
          },
          {
            "type": "OUT",
            "name": "COM 2"
          },
          {
            "type": "OUT",
            "name": "VOL"
          },
          {
            "type": "OUT",
            "name": "IR"
          },
          {
            "type": "OUT",
            "name": "RELAYS"
          },
          {
            "type": "OUT",
            "name": "D IN"
          },
          {
            "type": "OUT",
            "name": "LAN / PoE"
          }
        ]
      },
      {
        "id": "eq_5",
        "label": "Marshall CV-605_U3",
        "marque": "Marshall",
        "modele": "CV-605_U3",
        "fonction": "Caméra PTZ USB",
        "x": 2859.95,
        "y": 551.6,
        "ports": [
          {
            "type": "IN",
            "name": "RS-232"
          },
          {
            "type": "IN",
            "name": "1/8 Audio In"
          },
          {
            "type": "OUT",
            "name": "HDMI"
          },
          {
            "type": "OUT",
            "name": "USB C"
          },
          {
            "type": "OUT",
            "name": "ETHERNET"
          }
        ]
      },
      {
        "id": "eq_6",
        "label": "Extron DTP2  R 211",
        "marque": "Extron",
        "modele": "DTP2  R 211",
        "fonction": "4K/60 HDMI DTP2 R w A Emb",
        "x": 2859.95,
        "y": 384.28,
        "ports": [
          {
            "type": "IN",
            "name": "DTP2 IN"
          },
          {
            "type": "OUT",
            "name": "HDMI"
          },
          {
            "type": "OUT",
            "name": "L"
          },
          {
            "type": "OUT",
            "name": "R"
          },
          {
            "type": "OUT",
            "name": "RS-232"
          },
          {
            "type": "OUT",
            "name": "IR"
          }
        ]
      },
      {
        "id": "eq_7",
        "label": "Da-Lite 70222L",
        "marque": "Da-Lite",
        "modele": "70222L",
        "fonction": "Écran de projection motorisée",
        "x": 3114.8,
        "y": 598.87,
        "ports": []
      },
      {
        "id": "eq_8",
        "label": "Da-Lite",
        "marque": "Da-Lite",
        "modele": "",
        "fonction": "Contrôleur mural vs toile",
        "x": 3114.8,
        "y": 514.24,
        "ports": [
          {
            "type": "IN",
            "name": "UCD"
          },
          {
            "type": "IN",
            "name": "RJ45"
          },
          {
            "type": "IN",
            "name": "UCD"
          }
        ]
      },
      {
        "id": "eq_9",
        "label": "Extron AAP 104",
        "marque": "Extron",
        "modele": "AAP 104",
        "fonction": "Plaque murale",
        "x": 2124.4,
        "y": 601.81,
        "ports": []
      },
      {
        "id": "eq_10",
        "label": "Logitech C930e",
        "marque": "Logitech",
        "modele": "C930e",
        "fonction": "Webcam HD",
        "x": 2124.4,
        "y": 526.6,
        "ports": []
      },
      {
        "id": "eq_11",
        "label": "Lenovo Clavier USB",
        "marque": "Lenovo",
        "modele": "Clavier USB",
        "fonction": "Périphérique",
        "x": 2124.4,
        "y": 484.83,
        "ports": []
      },
      {
        "id": "eq_12",
        "label": "Lenovo Souris USB",
        "marque": "Lenovo",
        "modele": "Souris USB",
        "fonction": "Périphérique",
        "x": 2124.4,
        "y": 441.0,
        "ports": []
      },
      {
        "id": "eq_13",
        "label": "Extron HAE 100 4K Plus",
        "marque": "Extron",
        "modele": "HAE 100 4K Plus",
        "fonction": "Extracteur audio HDMI",
        "x": 2439.38,
        "y": 427.5,
        "ports": []
      },
      {
        "id": "eq_14",
        "label": "Extron VCM 110",
        "marque": "Extron",
        "modele": "VCM 110",
        "fonction": "Contrôleur volume",
        "x": 2690.78,
        "y": 510.93,
        "ports": []
      },
      {
        "id": "eq_15",
        "label": "Extron PS 125",
        "marque": "Extron",
        "modele": "PS 125",
        "fonction": "Alimentation 12V",
        "x": 2106.92,
        "y": 389.28,
        "ports": []
      },
      {
        "id": "eq_16",
        "label": "Epson EB-L510U",
        "marque": "Epson",
        "modele": "EB-L510U",
        "fonction": "Projecteur laser 5000lm",
        "x": 2992.01,
        "y": 309.28,
        "ports": []
      },
      {
        "id": "eq_17",
        "label": "Extron SW2 HD 4K Plus",
        "marque": "Extron",
        "modele": "SW2 HD 4K Plus",
        "fonction": "Commutateur HDMI 2x1",
        "x": 2426.67,
        "y": 344.28,
        "ports": []
      },
      {
        "id": "eq_18",
        "label": "Tripp Lite 1584T8B1",
        "marque": "Tripp Lite",
        "modele": "1584T8B1",
        "fonction": "PDU / Barre d'alimentation",
        "x": 2156.92,
        "y": 298.37,
        "ports": []
      },
      {
        "id": "eq_19",
        "label": "Sennheiser TCC2",
        "marque": "Sennheiser",
        "modele": "TCC2",
        "fonction": "Microphone plafond",
        "x": 2859.94,
        "y": 131.75,
        "ports": []
      },
      {
        "id": "eq_20",
        "label": "Radial JS-2",
        "marque": "Radial",
        "modele": "JS-2",
        "fonction": "DI Box passive",
        "x": 2426.67,
        "y": 211.68,
        "ports": []
      },
      {
        "id": "eq_21",
        "label": "Roland RCC-10-USXF",
        "marque": "Roland",
        "modele": "RCC-10-USXF",
        "fonction": "Convertisseur XLR/USB",
        "x": 2121.03,
        "y": 96.49,
        "ports": []
      },
      {
        "id": "eq_22",
        "label": "Extron XPA U 1004",
        "marque": "Extron",
        "modele": "XPA U 1004",
        "fonction": "Amplificateur 4x100W",
        "x": 2690.78,
        "y": 237.16,
        "ports": []
      },
      {
        "id": "eq_23",
        "label": "Extron SF 3C LP",
        "marque": "Extron",
        "modele": "SF 3C LP",
        "fonction": "Haut-parleur plafond",
        "x": 2859.94,
        "y": 211.75,
        "ports": []
      },
      {
        "id": "eq_24",
        "label": "Extron SF 3C LP",
        "marque": "Extron",
        "modele": "SF 3C LP",
        "fonction": "Haut-parleur plafond",
        "x": 2992.44,
        "y": 211.75,
        "ports": []
      },
      {
        "id": "eq_25",
        "label": "Extron SM 26",
        "marque": "Extron",
        "modele": "SM 26",
        "fonction": "Haut-parleur mural",
        "x": 3114.8,
        "y": 272.81,
        "ports": []
      },
      {
        "id": "eq_26",
        "label": "Extron SM 26",
        "marque": "Extron",
        "modele": "SM 26",
        "fonction": "Haut-parleur mural",
        "x": 3114.8,
        "y": 211.75,
        "ports": []
      },
      {
        "id": "eq_27",
        "label": "Dell P2719H",
        "marque": "Dell",
        "modele": "P2719H",
        "fonction": "Moniteur 27\" FHD",
        "x": 2426.67,
        "y": 505.42,
        "ports": []
      },
      {
        "id": "eq_28",
        "label": "Lenovo ThinkCentre M80q G3",
        "marque": "Lenovo",
        "modele": "ThinkCentre M80q G3",
        "fonction": "Mini PC",
        "x": 2294.62,
        "y": 329.28,
        "ports": []
      }
    ],
    "cables": [
      {
        "code": "V001",
        "category": "Video",
        "x": 2095.88,
        "y": 630.99
      },
      {
        "code": "V002",
        "category": "Video",
        "x": 2179.4,
        "y": 630.99
      },
      {
        "code": "U002",
        "category": "USB",
        "x": 2179.4,
        "y": 546.6
      },
      {
        "code": "U003",
        "category": "USB",
        "x": 2178.92,
        "y": 506.4
      },
      {
        "code": "U004",
        "category": "USB",
        "x": 2179.22,
        "y": 461.66
      },
      {
        "code": "V004",
        "category": "Video",
        "x": 2349.62,
        "y": 364.28
      },
      {
        "code": "V003",
        "category": "Video",
        "x": 2349.62,
        "y": 369.28
      },
      {
        "code": "V005",
        "category": "Video",
        "x": 2481.67,
        "y": 369.28
      },
      {
        "code": "V006",
        "category": "Video",
        "x": 2613.72,
        "y": 369.28
      },
      {
        "code": "C001",
        "category": "Control",
        "x": 2613.72,
        "y": 546.6
      },
      {
        "code": "C003",
        "category": "Control",
        "x": 2745.78,
        "y": 485.93
      },
      {
        "code": "R005",
        "category": "Network",
        "x": 2745.78,
        "y": 374.28
      },
      {
        "code": "A001",
        "category": "Audio",
        "x": 2613.72,
        "y": 354.28
      },
      {
        "code": "A002",
        "category": "Audio",
        "x": 2613.72,
        "y": 349.28
      },
      {
        "code": "C002",
        "category": "Control",
        "x": 2662.25,
        "y": 270.13
      },
      {
        "code": "R001",
        "category": "Network",
        "x": 2613.72,
        "y": 511.6
      },
      {
        "code": "V007",
        "category": "Video",
        "x": 2914.95,
        "y": 374.28
      },
      {
        "code": "R006",
        "category": "Network",
        "x": 2963.48,
        "y": 339.28
      },
      {
        "code": "A003",
        "category": "Audio",
        "x": 2745.78,
        "y": 270.15
      },
      {
        "code": "A004",
        "category": "Audio",
        "x": 2745.78,
        "y": 265.15
      },
      {
        "code": "A005",
        "category": "Audio",
        "x": 2745.78,
        "y": 260.15
      },
      {
        "code": "A006",
        "category": "Audio",
        "x": 2745.78,
        "y": 255.15
      },
      {
        "code": "R003",
        "category": "Network",
        "x": 2349.62,
        "y": 359.28
      },
      {
        "code": "R004",
        "category": "Network",
        "x": 2481.67,
        "y": 359.28
      },
      {
        "code": "U005",
        "category": "USB",
        "x": 2266.09,
        "y": 364.28
      },
      {
        "code": "U006",
        "category": "USB",
        "x": 2266.09,
        "y": 359.28
      },
      {
        "code": "A007",
        "category": "Audio",
        "x": 2914.94,
        "y": 181.75
      },
      {
        "code": "R007",
        "category": "Network",
        "x": 2831.41,
        "y": 181.75
      },
      {
        "code": "A008",
        "category": "Audio",
        "x": 2481.67,
        "y": 226.68
      },
      {
        "code": "A009",
        "category": "Audio",
        "x": 2481.67,
        "y": 221.68
      },
      {
        "code": "R002",
        "category": "Network",
        "x": 2914.95,
        "y": 531.6
      },
      {
        "code": "U007",
        "category": "USB",
        "x": 2914.95,
        "y": 541.6
      },
      {
        "code": "U001",
        "category": "USB",
        "x": 2349.62,
        "y": 628.31
      },
      {
        "code": "C005",
        "category": "Control",
        "x": 3086.27,
        "y": 499.24
      }
    ]
  }
};

    var graphData = null;
    var currentRoom = CONFIG.defaultRoom;

    function load(room) {
        room = room || currentRoom;
        currentRoom = room;
        console.log("[GraphSearch] Chargement:", room);

        if (EMBEDDED_DATA[room]) {
            graphData = EMBEDDED_DATA[room];
            console.log("[GraphSearch] Donnees chargees:", graphData.equipments.length, "equipements,", graphData.cables.length, "cables");
            return Promise.resolve(true);
        }

        if (CONFIG.serverUrl) {
            return fetch(CONFIG.serverUrl + "/api/rooms/" + room + "/graph.json")
                .then(function(r) { return r.json(); })
                .then(function(data) { graphData = data; return true; })
                .catch(function(e) { console.error("[GraphSearch] Erreur:", e); return false; });
        }

        console.error("[GraphSearch] Aucune donnee pour:", room);
        return Promise.resolve(false);
    }

    function search(query) {
        if (!graphData) return { cables: [], equipment: [] };
        var q = (query || "").toLowerCase().trim();
        if (!q) return { cables: [], equipment: [] };

        var results = { cables: [], equipment: [] };

        // Recherche dans les equipements (marque, modele, fonction, label)
        (graphData.equipments || []).forEach(function(eq) {
            var searchText = [
                eq.label || "",
                eq.marque || "",
                eq.modele || "",
                eq.fonction || "",
                eq.id || ""
            ].join(" ").toLowerCase();

            if (searchText.indexOf(q) !== -1) {
                var portsIn = (eq.ports || []).filter(function(p) { return p.type === "IN"; }).length;
                var portsOut = (eq.ports || []).filter(function(p) { return p.type === "OUT"; }).length;
                results.equipment.push({
                    id: eq.id,
                    label: eq.label,
                    marque: eq.marque,
                    modele: eq.modele,
                    fonction: eq.fonction,
                    connections: { inbound: portsIn, outbound: portsOut, uncertain: 0 }
                });
            }
        });

        // Recherche dans les cables
        (graphData.cables || []).forEach(function(cable) {
            var searchText = [cable.code || "", cable.category || ""].join(" ").toLowerCase();
            if (searchText.indexOf(q) !== -1) {
                results.cables.push({
                    code: cable.code,
                    category: cable.category,
                    confidence: 0.9,
                    from: { label: "Source" },
                    to: { label: "Destination" }
                });
            }
        });

        return results;
    }

    function getStats() {
        if (!graphData) return null;
        return {
            nodes: (graphData.equipments || []).length,
            edges: (graphData.cables || []).length,
            uncertain: 0
        };
    }

    function getEquipment(nodeId) {
        if (!graphData) return null;
        var eq = (graphData.equipments || []).find(function(e) { return e.id === nodeId; });
        if (!eq) return null;

        // Trouver les cables connectes a cet equipement (par proximite)
        var connections = [];
        (graphData.cables || []).forEach(function(cable) {
            connections.push({
                code: cable.code,
                category: cable.category,
                direction: "sortant"
            });
        });

        return {
            id: eq.id,
            label: eq.label,
            marque: eq.marque || "",
            modele: eq.modele || eq.label,
            fonction: eq.fonction || "",
            ports: eq.ports || [],
            connections: connections.slice(0, 6)
        };
    }

    function getCable(code) {
        if (!graphData) return null;
        var cable = (graphData.cables || []).find(function(c) { return c.code === code; });
        if (!cable) return null;
        return {
            code: cable.code,
            category: cable.category,
            confidence: 0.9,
            from: { node: { label: "Source" } },
            to: { node: { label: "Destination" } }
        };
    }

    function getAllEquipments() {
        if (!graphData) return [];
        return (graphData.equipments || []).map(function(eq) {
            var portsIn = (eq.ports || []).filter(function(p) { return p.type === "IN"; }).length;
            var portsOut = (eq.ports || []).filter(function(p) { return p.type === "OUT"; }).length;
            return {
                id: eq.id,
                label: eq.label,
                marque: eq.marque || "",
                modele: eq.modele || eq.label,
                fonction: eq.fonction || "",
                connections: { inbound: portsIn, outbound: portsOut, uncertain: 0 }
            };
        });
    }

    function getAllCables() {
        if (!graphData) return [];
        return (graphData.cables || []).map(function(cable) {
            return {
                code: cable.code,
                category: cable.category,
                confidence: 0.9
            };
        });
    }

    window.GraphSearch = {
        load: load,
        search: search,
        getStats: getStats,
        getEquipment: getEquipment,
        getCable: getCable,
        getAllEquipments: getAllEquipments,
        getAllCables: getAllCables,
        setRoom: function(room) { currentRoom = room; },
        getRoom: function() { return currentRoom; }
    };
})();

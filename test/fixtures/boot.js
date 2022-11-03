!function() {
    var n = 'semaphore'
      , a = {
        "v": 1,
        "organization": {
            "code": "vara_labs"
        },
        "app": {
            "code": "vara_labs",
            "name": "Vara Labs",
            "platform": "WEB"
        },
        "environments": [{
            "code": "production",
            "pattern": "Lio=",
            "hash": "1530022652777879677"
        }],
        "policyScope": {
            "defaultScopeCode": "default",
            "variable": "test",
            "scopes": {
                "AG": "test_automation_239",
                "AI": "test_automation_239",
                "AR": "test_automation_239",
                "AW": "test_automation_239",
                "BB": "test_automation_239",
                "BL": "test_automation_239",
                "BM": "test_automation_239",
                "BO": "test_automation_239",
                "BQ": "test_automation_239",
                "BR": "test_automation_239",
                "BS": "test_automation_239",
                "BV": "test_automation_239",
                "BZ": "test_automation_239",
                "CA": "test_automation_239",
                "CL": "test_automation_239",
                "CO": "test_automation_239",
                "CR": "test_automation_239",
                "CU": "test_automation_239",
                "CW": "test_automation_239",
                "CX": "suhail_test_jurisdiction",
                "DM": "test_automation_239",
                "DO": "test_automation_239",
                "EC": "test_automation_239",
                "FK": "test_automation_239",
                "GD": "test_automation_239",
                "GF": "test_automation_239",
                "GL": "test_automation_239",
                "GP": "test_automation_239",
                "GS": "test_automation_239",
                "GT": "test_automation_239",
                "GY": "test_automation_239",
                "HN": "test_automation_239",
                "HT": "test_automation_239",
                "JM": "test_automation_239",
                "KN": "test_automation_239",
                "KY": "test_automation_239",
                "LC": "test_automation_239",
                "MF": "test_automation_239",
                "MQ": "test_automation_239",
                "MS": "test_automation_239",
                "MX": "test_automation_239",
                "NI": "test_automation_239",
                "PA": "test_automation_239",
                "PE": "test_automation_239",
                "PM": "test_automation_239",
                "PR": "test_automation_239",
                "PY": "test_automation_239",
                "SR": "test_automation_239",
                "SV": "test_automation_239",
                "SX": "test_automation_239",
                "TC": "test_automation_239",
                "TT": "test_automation_239",
                "US-AK": "test_automation_239",
                "US-AL": "test_automation_239",
                "US-AR": "test_automation_239",
                "US-AZ": "test_automation_239",
                "US-CA": "test_automation_239",
                "US-CO": "test_automation_239",
                "US-CT": "test_automation_239",
                "US-DC": "test_automation_239",
                "US-DE": "test_automation_239",
                "US-FL": "test_automation_239",
                "US-GA": "test_automation_239",
                "US-HI": "test_automation_239",
                "US-IA": "test_automation_239",
                "US-ID": "test_automation_239",
                "US-IL": "test_automation_239",
                "US-IN": "test_automation_239",
                "US-KS": "test_automation_239",
                "US-KY": "test_automation_239",
                "US-LA": "test_automation_239",
                "US-MA": "test_automation_239",
                "US-MD": "test_automation_239",
                "US-ME": "test_automation_239",
                "US-MI": "test_automation_239",
                "US-MN": "test_automation_239",
                "US-MO": "test_automation_239",
                "US-MS": "test_automation_239",
                "US-MT": "test_automation_239",
                "US-NC": "test_automation_239",
                "US-ND": "test_automation_239",
                "US-NE": "test_automation_239",
                "US-NH": "test_automation_239",
                "US-NJ": "test_automation_239",
                "US-NM": "test_automation_239",
                "US-NV": "test_automation_239",
                "US-NY": "test_automation_239",
                "US-OH": "test_automation_239",
                "US-OK": "test_automation_239",
                "US-OR": "test_automation_239",
                "US-PA": "test_automation_239",
                "US-RI": "test_automation_239",
                "US-SC": "test_automation_239",
                "US-SD": "test_automation_239",
                "US-TN": "test_automation_239",
                "US-TX": "test_automation_239",
                "US-UT": "test_automation_239",
                "US-VA": "test_automation_239",
                "US-VT": "test_automation_239",
                "US-WA": "test_automation_239",
                "US-WI": "test_automation_239",
                "US-WV": "test_automation_239",
                "US-WY": "test_automation_239",
                "UY": "test_automation_239",
                "VC": "test_automation_239",
                "VE": "test_automation_239",
                "VG": "test_automation_239",
                "VI": "test_automation_239"
            }
        },
        "identities": {
            "2c_cld": {
                "type": "cookie",
                "variable": "2c.cld",
                "format": "string",
                "priority": 5
            },
            "DYID": {
                "type": "window",
                "variable": "DY.dyid",
                "format": "string",
                "priority": 5
            },
            "anonymousID": {
                "type": "cookie",
                "variable": "ajs_anonymous_id",
                "format": "string",
                "priority": 5
            },
            "clientID": {
                "type": "cookie",
                "variable": "_ga",
                "format": "string",
                "priority": 5
            },
            "coveoVisitorID": {
                "type": "cookie",
                "variable": "coveo_visitorId",
                "format": "string",
                "priority": 5
            },
            "customer_id": {
                "type": "window",
                "variable": "__st.cid",
                "format": "string",
                "priority": 5
            },
            "deviceID": {
                "type": "window",
                "variable": "mparticle.getDeviceId()",
                "format": "string",
                "priority": 5
            },
            "distinctID": {
                "type": "window",
                "variable": "mixpanel.get_distinct_id()",
                "format": "string",
                "priority": 5
            },
            "email": {
                "type": "cookie",
                "variable": "email",
                "format": "json",
                "key": "key",
                "priority": 2
            },
            "emailsha256": {
                "type": "cookie",
                "variable": "emailsha256",
                "format": "string",
                "priority": 2
            },
            "fifth": {
                "type": "sessionStorage",
                "variable": "test",
                "format": "semicolon",
                "key": "key",
                "priority": 4
            },
            "first": {
                "type": "dataLayer",
                "variable": "test",
                "format": "string",
                "key": "key123",
                "priority": -1
            },
            "fourth": {
                "type": "localStorage",
                "variable": "test",
                "format": "query",
                "key": "key",
                "priority": 1
            },
            "heap.userID": {
                "type": "window",
                "variable": "heap.userId",
                "format": "string",
                "priority": 5
            },
            "hubspotutk": {
                "type": "cookie",
                "variable": "hubspotutk",
                "format": "string",
                "priority": 5
            },
            "lspa": {
                "type": "window",
                "variable": "window.LSPA=Y",
                "format": "string",
                "priority": 5
            },
            "mParticleID": {
                "type": "window",
                "variable": "mParticle.Identity.getCurrentUser().getMPID()",
                "format": "string",
                "priority": 5
            },
            "optimizelyEndUserID": {
                "type": "cookie",
                "variable": "optimizelyEndUserId",
                "format": "string",
                "priority": 5
            },
            "phone_number": {
                "type": "cookie",
                "variable": "phoneNumber",
                "format": "string",
                "priority": 2
            },
            "second": {
                "type": "window",
                "variable": "test",
                "format": "json",
                "key": "key",
                "priority": -2
            },
            "sixth": {
                "type": "queryString",
                "variable": "test",
                "format": "string",
                "key": "key",
                "priority": 4
            },
            "swb_dinghy": {
                "type": "window",
                "variable": "window.amplitude.getInstance().options.deviceId",
                "format": "string"
            },
            "swb_managed_cookie": {
                "type": "dataLayer",
                "variable": "juicebox",
                "format": "json",
                "key": "key"
            },
            "swb_vara_labs": {
                "type": "managedCookie",
                "variable": "_swb"
            },
            "third": {
                "type": "cookie",
                "variable": "test",
                "format": "jwt",
                "key": "key",
                "priority": 1
            },
            "userID": {
                "type": "window",
                "variable": "analytics.user().id()",
                "format": "string",
                "priority": 5
            },
            "visitorID": {
                "type": "window",
                "variable": "window.pendo.visitorId",
                "format": "string",
                "priority": 5
            },
            "visitor_id": {
                "type": "cookie",
                "variable": "intercom-id*",
                "format": "string",
                "priority": 5
            }
        },
        "scripts": [
          "https://cdn.uat.ketchjs.com/ketchtag/latest/static/ketch.js",
          "https://cdn.uat.ketchjs.com/lanyard/static/lanyard.js",
          "https://cdn.uat.ketchjs.com/plugins/static/plugins.js"
        ],
        "languages": [{
            "code": "zh",
            "englishName": "Chinese",
            "nativeName": "中文 "
        }, {
            "code": "fr",
            "englishName": "French",
            "nativeName": "Français"
        }, {
            "code": "es",
            "englishName": "Spanish",
            "nativeName": "Español"
        }, {
            "code": "en",
            "englishName": "English",
            "nativeName": "English"
        }],
        "services": {
            "lanyard": "https://global.ketchcdn.com/transom/route/switchbit/lanyard/vara_labs/lanyard.js",
            "shoreline": "https://dev.ketchcdn.com/web/v2"
        },
        "options": {
            "localStorage": 1,
            "migration": 1
        },
        "optionsNew": {
            "appDivs": "hubspot-messages-iframe-container",
            "localStorage": "1",
            "migration": "1"
        },
        "property": {
            "code": "vara_labs",
            "name": "Vara Labs",
            "platform": "WEB",
            "proxy": "test"
        },
        "jurisdiction": {
            "defaultScopeCode": "default",
            "variable": "test",
            "scopes": {
                "AG": "test_automation_239",
                "AI": "test_automation_239",
                "AR": "test_automation_239",
                "AW": "test_automation_239",
                "BB": "test_automation_239",
                "BL": "test_automation_239",
                "BM": "test_automation_239",
                "BO": "test_automation_239",
                "BQ": "test_automation_239",
                "BR": "test_automation_239",
                "BS": "test_automation_239",
                "BV": "test_automation_239",
                "BZ": "test_automation_239",
                "CA": "test_automation_239",
                "CL": "test_automation_239",
                "CO": "test_automation_239",
                "CR": "test_automation_239",
                "CU": "test_automation_239",
                "CW": "test_automation_239",
                "CX": "suhail_test_jurisdiction",
                "DM": "test_automation_239",
                "DO": "test_automation_239",
                "EC": "test_automation_239",
                "FK": "test_automation_239",
                "GD": "test_automation_239",
                "GF": "test_automation_239",
                "GL": "test_automation_239",
                "GP": "test_automation_239",
                "GS": "test_automation_239",
                "GT": "test_automation_239",
                "GY": "test_automation_239",
                "HN": "test_automation_239",
                "HT": "test_automation_239",
                "JM": "test_automation_239",
                "KN": "test_automation_239",
                "KY": "test_automation_239",
                "LC": "test_automation_239",
                "MF": "test_automation_239",
                "MQ": "test_automation_239",
                "MS": "test_automation_239",
                "MX": "test_automation_239",
                "NI": "test_automation_239",
                "PA": "test_automation_239",
                "PE": "test_automation_239",
                "PM": "test_automation_239",
                "PR": "test_automation_239",
                "PY": "test_automation_239",
                "SR": "test_automation_239",
                "SV": "test_automation_239",
                "SX": "test_automation_239",
                "TC": "test_automation_239",
                "TT": "test_automation_239",
                "US-AK": "test_automation_239",
                "US-AL": "test_automation_239",
                "US-AR": "test_automation_239",
                "US-AZ": "test_automation_239",
                "US-CA": "test_automation_239",
                "US-CO": "test_automation_239",
                "US-CT": "test_automation_239",
                "US-DC": "test_automation_239",
                "US-DE": "test_automation_239",
                "US-FL": "test_automation_239",
                "US-GA": "test_automation_239",
                "US-HI": "test_automation_239",
                "US-IA": "test_automation_239",
                "US-ID": "test_automation_239",
                "US-IL": "test_automation_239",
                "US-IN": "test_automation_239",
                "US-KS": "test_automation_239",
                "US-KY": "test_automation_239",
                "US-LA": "test_automation_239",
                "US-MA": "test_automation_239",
                "US-MD": "test_automation_239",
                "US-ME": "test_automation_239",
                "US-MI": "test_automation_239",
                "US-MN": "test_automation_239",
                "US-MO": "test_automation_239",
                "US-MS": "test_automation_239",
                "US-MT": "test_automation_239",
                "US-NC": "test_automation_239",
                "US-ND": "test_automation_239",
                "US-NE": "test_automation_239",
                "US-NH": "test_automation_239",
                "US-NJ": "test_automation_239",
                "US-NM": "test_automation_239",
                "US-NV": "test_automation_239",
                "US-NY": "test_automation_239",
                "US-OH": "test_automation_239",
                "US-OK": "test_automation_239",
                "US-OR": "test_automation_239",
                "US-PA": "test_automation_239",
                "US-RI": "test_automation_239",
                "US-SC": "test_automation_239",
                "US-SD": "test_automation_239",
                "US-TN": "test_automation_239",
                "US-TX": "test_automation_239",
                "US-UT": "test_automation_239",
                "US-VA": "test_automation_239",
                "US-VT": "test_automation_239",
                "US-WA": "test_automation_239",
                "US-WI": "test_automation_239",
                "US-WV": "test_automation_239",
                "US-WY": "test_automation_239",
                "UY": "test_automation_239",
                "VC": "test_automation_239",
                "VE": "test_automation_239",
                "VG": "test_automation_239",
                "VI": "test_automation_239"
            }
        }
    };
    a.language = a.language || window.navigator.language,
    (window[n] = window[n] || []).unshift(["init", a]);
}();

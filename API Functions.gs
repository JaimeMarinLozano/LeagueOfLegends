function apiCall(url){
	var response = UrlFetchApp.fetch(url, {'muteHttpExceptions' : true});
	
	var responseBody = JSON.parse(response.getContentText());
	
	// Obtener errores de código
	switch (response.getResponseCode()){
	case 200:
		return responseBody;
		break;
	case 400:
		SpreadsheetApp.getUi().alert("400: API Call mal realizada. Contactadme con el error.");
		break;
	case 403:
		SpreadsheetApp.getUi().alert("403: API Call se interpreta como prohibida. Comprueba tu API Key!");
		break;
	case 404:
        // Nos saltamos este error para poder utilizar el championMastery aunque no tengamos datos sobre esos campeones
        return responseBody;
		break;
	case 429:
		// Obtener reader de respuesta
		var responseHeader = response.getHeaders();
        
		// Obtener tiempo de reintento
		var timeout = 0 + (responseHeader['Retry-After']);
        
		// Advertencia al usuario
		SpreadsheetApp.getUi().alert("Reached Rate Limit.  Waiting "+timeout+" Seconds...");
		
		// Espera
		timeout *= 1000;
		Utilities.sleep(timeout);
		
		// Reintento
		return apiCall(url);
		break;
	case 500:
	case 502:
	case 503:
	case 504:
		SpreadsheetApp.getUi().alert("Riot Server Error. Check API Status, or Retry in a few moments");
		break;
	}
}

function summonerInfo(apiKey, region, summonerName){
	var url = ("https://"+region+".api.riotgames.com/lol/summoner/v4/summoners/by-name/"+summonerName+"?api_key="+apiKey);
	return apiCall(url);
}

function rankInfo(apiKey, region, summonerId){
	var url = ("https://"+region+".api.riotgames.com/lol/league/v4/positions/by-summoner/"+summonerId+"?api_key="+apiKey);
	return apiCall(url);
}

function matchList(apiKey, region, accountId, queue, begin, end){
    // Season 8
    var url = ("https://"+region+".api.riotgames.com/lol/match/v4/matchlists/by-account/"+accountId+"?queue="+queue+"&season=11&beginIndex="+begin+"&endIndex="+end+"&api_key="+apiKey);
    return apiCall(url);
}

function matchDetails(apiKey, region, matchId){
	var url = ("https://"+region+".api.riotgames.com/lol/match/v4/matches/"+matchId+"?api_key="+apiKey);
	return apiCall(url);
}

function matchTimeline(apiKey, region, matchId){
    var url = ("https://"+region+".api.riotgames.com/lol/match/v4/timelines/by-match/"+matchId+"?api_key="+apiKey);
    return apiCall(url);
}

function championMastery(apiKey, region, summonerId,champid){
    var url = ("https://"+region+".api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-summoner/"+summonerId+"/by-champion/"+champid+"?api_key="+apiKey);
	return apiCall(url);
}

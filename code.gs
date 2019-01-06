// Autor: Jaime Marín Lozano

var apiKey = "";
var region = "EUW1";
var language = "es_ES";

var summoner = {name:"One Trick Jester", accountId:"207714657", id:"44945954"};
var rank = {tier:"Gold", division:"III", queue:"Solo", series:""};

function setup(){
  // Sheets
  var setupSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Setup");
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Match History");
  // Variables globales
  apiKey = setupSheet.getRange("A2").getValue();
  region = setupSheet.getRange("A4").getValue();

  // Detalles del invocador
  // Obtener nombre invocador
  var summonerName = setupSheet.getRange("A6").getValue();
  // Eliminar espacios y pasar a minúsculas
  summonerName = summonerName.toLowerCase().replace(/\s+/g, '');
  // Obtener información restante de la API
  var summonerCall = summonerInfo(apiKey, region, summonerName);
  summoner['name'] = summonerName;
  summoner["accountId"] = summonerCall["accountId"];
  summoner["id"] = summonerCall["id"];

  // Detalles de las ranked
  // Llamar a la API
  var rankedInfo = rankInfo(apiKey, region, summoner['id'])
  // Obtener la cola solicitada
  rank["queue"] = sheet.getRange(1,1).getValue();
  switch (rank["queue"]){
    case "Solo / Duo":
      rank["queue"] = "RANKED_SOLO_5x5";
      break;
    case "Flex":
      rank["queue"] = "RANKED_FLEX_SR";
      break;
    case "3v3":
      rank["queue"] = "RANKED_FLEX_TT"
      break;
  }
  // Comprobar si el jugador está en clasificatoria
  var isRanked = false;
  for (var q in rankedInfo){
    if (rankedInfo[q]['queueType']==rank['queue']){
      // Está en clasificatoria si se cumple la siguiente condición
      isRanked = true;
      // Establecer información de las clasificatorias
      var tier = rankedInfo[q]["tier"];
      rank["tier"] = tier.charAt(0) + tier.toLowerCase().slice(1);
      rank["division"] = rankedInfo[q]["rank"];
      try { 
        rank["series"] = rankedInfo[queue]['miniSeries']['progress']; 
      } 
      catch(error){}
    }
  }
  // Si se cumple la siguiente condición está unranked
  if (isRanked == false){
  	rank["tier"] = "Unranked";
  	rank["division"] = 'V';
  }
}

function addGames(){
  // Seleccionamos sheet
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Match History");

  // Setup
  setup();

  // Si se ha cambiado el nombre de invocador o la cola, limpiamos sheet
  var oldSummonerName = sheet.getRange('AF1').getValue();
  var oldQueue = sheet.getRange('AG1').getValue();
  oldSummonerName = oldSummonerName.toLowerCase().replace(/\s+/g, '');
  if (summoner['name'] != oldSummonerName || sheet.getRange(1,1).getValue() != oldQueue){
    sheet.getRange('A5:AM').clearContent();
  }
  sheet.getRange('AF1').setValue(summoner['name']);
  sheet.getRange('AG1').setValue(sheet.getRange(1,1).getValue());
  
  // Variables relacionadas con la lista de partidas
  var matches = [];
  var indexed = 0;
  var endIndex = 100;
  var gamesToIndex = true;
  var listOfMatches;
  var queueId;

  switch(rank['queue']){
  case "RANKED_SOLO_5x5":
    queueId = 420;
    break;
  case "RANKED_FLEX_SR":
    queueId = 440;
    break;
  case "RANKED_FLEX_TT":
    queueId = 470;
    break;
  }
  
  do{
    // Obtener la lista de partidas
    listOfMatches = matchList(apiKey, region, summoner['accountId'], queueId, indexed, endIndex);

    // Si hay menos de 100 partidas asumimos que todas las partidas se han obtenido
    if (listOfMatches['matches'].length<100){
      gamesToIndex = false;
    }

    // Para cada partida obtener el matchid
    for (var m in listOfMatches['matches']){
      matches[indexed] = listOfMatches['matches'][m]['gameId'];
      indexed++;
    }
    endIndex += 100;
    // Fail safe
    if (listOfMatches['matches'][0]==undefined){
      indexed = gamesToIndex;
    }
  }while(gamesToIndex);

  // Obtener el número de partidas que han sido obtenidas
  if (sheet.getLastRow() > 4){
    gamesToIndex = (matches.length - (1 + matches.length - 1));
  }else{
    gamesToIndex = (matches.length - (1 + matches.length - 1)) ;
  }

  // Obtener los detalles de la partida
  for (var matchId = gamesToIndex; matchId <= (matches.length-1); matchId++){
    if (matches[matchId]!=undefined){
      var match = matchDetails(apiKey, region, matches[matchId]);
      var currentRow = sheet.getLastRow()+1;
      // Introducir los detalles en excel
      sheet.appendRow(processOutput(match, matches[matchId], currentRow));
    }
  }

  // Limpiar si hay excesivas partidas
  if(sheet.getLastRow()>1004){
    format();
  }
}

function processOutput(match, matchId, currentRow){
  // Desglose de la partida

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Match History");

	// ID Jugador
	var p = 0;
	// Loop para encontrar al jugador
	for (var i in match['participantIdentities']){
		if (match['participantIdentities'][i]['player']['currentAccountId'] == summoner['accountId'])
			p = i;
	}

	// Match History Link
	var matchHistory = "http://matchhistory";
	// Región
	switch (region){
		case "KR":
			matchHistory += "leagueoflegends.co.kr/ko";
			break;
		case "NA1":
			matchHistory += ".na.leagueoflegends.com/en";
			break;
		case "EUW1":
			matchHistory += ".euw.leagueoflegends.com/en";
			break;
		case "EUN1":
			matchHistory += ".eune.leagueoflegends.com/en";
			break;
		case "TR1":
			matchHistory += ".tr.leagueoflegends.com/tr";
			break;
		case "BR1":
			matchHistory += ".br.leagueoflegends.com/pt";
			break;
		case "LA1":
			matchHistory += ".lan.leagueoflegends.com/es";
			break;
		case "LA2":
			matchHistory += ".las.leagueoflegends.com/es";
			break;
		case "JP1":
			matchHistory += ".jp.leagueoflegends.com/ja";
			break;
		case "RU1":
			matchHistory += ".ru.leagueoflegends.com/ru";
			break;
		case "OC1":
			matchHistory += ".oce.leagueoflegends.com/en";
			break;
	}
	// Añadir constantes
	matchHistory += "/#match-details/"+region+"/"+matchId+"/"+summoner['accountId'];

	// ID Campeón
	var championId = match['participants'][p]['championId'];

	// Rol
	var role = match['participants'][p]['timeline']['lane'];
	switch (role){
		case "BOTTOM":
			// Si el rol es BOTTOM, usamos ROLE
			role = (match['participants'][p]['timeline']['role']).slice(4);
			// Si es CARRY lo nombramos como ADC, si es SUPP lo dejamos
			role = (role==="CARRY")?"ADC":role.charAt(0) + role.toLowerCase().slice(1);
			break;
		default:
			// El resto de roles los dejamos como vienen
			role = role.charAt(0) + role.toLowerCase().slice(1);
			break;
	}

	// KDA
	var k = match['participants'][p]['stats']['kills'];
	var d = match['participants'][p]['stats']['deaths'];
	var a = match['participants'][p]['stats']['assists'];
	var kda = ''+k+' / '+d+' / '+a+'';

	// K%: (Kills + Asistencias) / Kills del equipo
	var teamKills = 0;
	var team = (match['participants'][p]['teamId']==100)?match['participants'].length/2:match['participants'].length;
	for (var t=team-match['participants'].length/2; t<team; t++){
		teamKills += match['participants'][t]['stats']['kills'];
	}
	var killPart = (k + a) / teamKills;

	// CS
	var cs = match['participants'][p]['stats']['neutralMinionsKilled'] + match['participants'][p]['stats']['totalMinionsKilled'];

	// Daño
	var dealt = match['participants'][p]['stats']['totalDamageDealtToChampions'];
	var healed = match['participants'][p]['stats']['totalHeal'];
	var taken = match['participants'][p]['stats']['totalDamageTaken'];
	var mitigated = match['participants'][p]['stats']['damageSelfMitigated'];

	// Oro ganado
	var gold = match['participants'][p]['stats']['goldEarned'];

	// Duración
	var duration = match['gameDuration'];

	// Fecha de la partida
	var date = match['gameCreation'];

	// Resultado
	var result = (match['participants'][p]['stats']['win'])?'Victory':'Defeat';

	// Ver si la partida ha sido Remake
	var inactive = k+a+d+cs+dealt+taken;

	if (duration<300 && inactive>0){
	  result = "Remake"
	}else if (duration<300 && inactive==0){
	  result = "Defeat";
	}
    
    // Variables de la clasificatoria
    var tier = rank['tier'];
    var div = rank['division'];
    var series = rank['series'];

	// Procesar la liga como un número
	var tierNumber = 0;
	switch(tier){
		case "Bronze":tierNumber=0;break;
		case "Silver":tierNumber=1;break;
		case "Gold":tierNumber=2;break;
		case "Platinum":tierNumber=3;break;
		case "Diamond":tierNumber=4;break;
		case "Master":tierNumber=5;break;
		case "Challenger":tierNumber=6;break;
		default: tierNumber=0;break;
	}

	// Procesar la división como un número
	var division;
	switch(div){
		case 'I':division=1;break;
		case 'II':division=2;break;
		case 'III':division=3;break;
		case 'IV':division=4;break;
		case 'V':division=5;break;
	}

	// Visión
	var wardsPlaced = match['participants'][p]['stats']['wardsPlaced'];
	var wardsKilled = match['participants'][p]['stats']['wardsKilled'];
	var wardsBought = match['participants'][p]['stats']['visionWardsBoughtInGame'];
	var visionScore = match['participants'][p]['stats']['visionScore'];

	// Devolver una cadena con los detalles de los partidos
	var matchBreakdown = ['=hyperlink("'+matchHistory+'", row()-4)','=FILTER(Help!$H2:$H,Help!$I2:$I='+championId+')',role,kda,killPart,cs,'='+cs+'/('+duration+'/60)',gold,dealt,healed,taken,mitigated,'='+duration+'/86400','=('+date+'/86400000)+"Jan-01-1970"',result,tier,division,'','',wardsPlaced,wardsKilled,wardsBought,visionScore,tierNumber,k,d,a,'=IF('+d+'=0,'+k+'+'+a+',('+k+'+'+a+')/'+d+')',matchId];
	return matchBreakdown;  
}

function addChampions(){
	// Setup: Obtener la API Key, la región y el nombre de invocador
    setup();
	
	// Sheet: Lista de campeones
	var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Champions");
    var sheetHelp = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Help");
	// Lipiar sheet
	sheet.getRange('B5:K').clearContent(); 
  
	// Loop para obtener datos
    var actualRow = 3;
    while(actualRow <= 141){
      var champid = sheetHelp.getRange("I"+actualRow).getValue();
	  var champMastery = championMastery(apiKey, region, summoner['id'],champid);  

      // Maestría de los campeones
		var masteryLevel = champMastery['championLevel'];
		var masteryPoints = champMastery['championPoints'];
		var chestGranted = champMastery['chestGranted'];
      
        if (masteryLevel == undefined){
          masteryLevel = "No Data";
		  masteryPoints = "No Data";
		  chestGranted = "No Data";
        }
      
		// Fila actual
		var currentRow = sheet.getLastRow() + 1;

		// KDA
		var kills = "SUM(FILTER('Match History'!Y5:Y,'Match History'!O5:O<>\"Remake\",'Match History'!B5:B=B"+currentRow+"))";
		var deaths = "SUM(FILTER('Match History'!Z5:Z,'Match History'!O5:O<>\"Remake\",'Match History'!B5:B=B"+currentRow+"))";
		var assists = "SUM(FILTER('Match History'!AA5:AA,'Match History'!O5:O<>\"Remake\",'Match History'!B5:B=B"+currentRow+"))";
		var kda = "=IF(J"+currentRow+"=\"\",\"\",("+kills+"+"+assists+")"+"/"+deaths+")";

		// CS/m
		var cs = "SUM(FILTER('Match History'!F5:F,'Match History'!O5:O<>\"Remake\",'Match History'!B5:B=B"+currentRow+"))";
		var minutes = "(SUM(FILTER('Match History'!M5:M,'Match History'!O5:O<>\"Remake\",'Match History'!B5:B=B"+currentRow+"))*1440)";
		var csm = "=IF(J"+currentRow+"=\"\",\"\","+cs+"/"+minutes+")";

		// Partidas
		var games = "=IF(ISNA(FILTER('Match History'!B5:B,'Match History'!B5:B=B"+currentRow+")),\"\",COUNTIF(FILTER('Match History'!A5:A,'Match History'!B5:B=B"+currentRow+",'Match History'!O5:O<>\"Remake\"),\">0\"))";
		// Win Rate
		var wins = "=IF(J"+currentRow+"=\"\",\"\",COUNTIF(FILTER('Match History'!O5:O,'Match History'!B5:B=B"+currentRow+"),\"Victory\")/J"+currentRow+")";

		// Extraer
		sheet.appendRow(['',"=Help!H"+actualRow,"=Help!I"+actualRow,chestGranted,masteryLevel,masteryPoints,kda,csm,wins,games]);
        actualRow = actualRow +1;
	}
	// Filtrar los campeones alfabéticamente
	sortChampions({column: 2, ascending: true});
}

function format(){
	var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Match History");
	// Añadir bordes a las nuevas filas
	sheet.getRange('B5:C').setBorder(null, true, null, true, null, null, 'white', SpreadsheetApp.BorderStyle.SOLID);
	sheet.getRange('F5:G').setBorder(null, true, null, true, null, null, 'white', SpreadsheetApp.BorderStyle.DASHED);
	sheet.getRange('H5:H').setBorder(null, true, null, true, null, null, 'white', SpreadsheetApp.BorderStyle.DASHED);
	sheet.getRange('M5:O').setBorder(null, true, null, true, null, null, 'white', SpreadsheetApp.BorderStyle.SOLID);
	sheet.getRange('T5:Y').setBorder(null, true, null, true, null, null, 'white', SpreadsheetApp.BorderStyle.SOLID);
	sheet.getRange('AB5:AE').setBorder(null, true, null, true, null, null, 'white', SpreadsheetApp.BorderStyle.SOLID);
}

function sortChampions(sortObject){
	// Filtrar los campeones por sortObject
	var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Champions");
	sheet.getRange('B5:F').sort(sortObject);
}

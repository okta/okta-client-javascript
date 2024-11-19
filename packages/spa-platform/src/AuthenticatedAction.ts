
// check storage for existing token

//      [ token exists ]
//      refresh token, if needed

//      [ token does not exist ]
//      request a new token from AS

//  check if a valid was found or requested

//      [ no (or invalid) token ]
//      throw error - cannot complete operation

//      [ valid token ]
//      happy path, continue

//      perform action (with token)
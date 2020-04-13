pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2; // needed to allow us to return an array from a function

contract Meme {
 
/****************************************************************************************************************
DATA STRUCTRUES
 ****************************************************************************************************************/
    // A mapping to keep track of file hashes returned from IPFS for each patient
    mapping(address => string []) public fileHashes;
    // A mapping to keep track of the list of doctors who have access to the meidcal files of each patient
    mapping(address => address []) public patientListOfDoctors;
    // A mapping to keep track of the list of patients a doctor has access to their medical files
    mapping(address => address []) public doctorListOfPatients;
    // A mapping to keep track of doctor-to-patient access permission
    mapping (address => mapping (address => bool)) public DoctorToPatientAccessPermission;
    // A mapping to keep track of all registered patients
    mapping (address => bool) public registeredPatients;
    // A mapping to keep track of all registered doctors
    mapping (address => bool) public registeredDoctors;
   // A struct to hold encrpyted passphrases/secrey keys and a mapping to keep track of all encrpyted passphrases/secret keys for a doctor
    struct EncryptedPassphrase{
            address patientAddress;
            string iv;
            string ephemPublicKey;
            string ciphertext;
            string mac;
   }
   mapping(address => EncryptedPassphrase [] ) public doctorListOfEnrpytedPassphrases;  // The "address key" here refers to the doctor's address
   // A mapping to keep track of the hashes of the encrpyted prviate keys for all users (i.e patient or doctor);
   mapping (address => string) public EncryptedPrivateKeyHashes;

/****************************************************************************************************************
MEDICAL FILE HASHES
 ****************************************************************************************************************/
    // Store the file hash returned from IPFS for a file upload made by a patient on the blockchain
    function addFileHash( address _patientID  ,string memory _fileHash) public  userExists(_patientID)  {
       require (!isEmptyString(_fileHash) ," File hash should not be empty !"); 
       fileHashes[_patientID].push(_fileHash);
    }
      // Get the number of file hashes sotred on the blockchain for a patient
    function getFileHashesCount(address _patientID)  view public  userExists(_patientID) returns (uint) {
       return fileHashes[_patientID].length;
    }
    // Get all the file hashes for a patient
    function getPatientFileHashes(address _patientID)  view public  userExists(_patientID)   returns (string [] memory) {
       return fileHashes [_patientID];
    }
/****************************************************************************************************************
GRANTING ACCESS
 ****************************************************************************************************************/
    // A patient grants a doctor an access to his/her medical documents.
    
    function grantAccessToDoctor ( address _doctorID, string memory iv, string memory ephemPublicKey, string memory ciphertext, string memory mac ) public userExists(_doctorID)  {
       require (!isEmptyString(iv) ,"iv should not be empty !");
       require (!isEmptyString(ephemPublicKey) ,"ephemPublicKey should not be empty !");
       require (!isEmptyString(ciphertext) ,"ciphertext should not be empty !");
       require (!isEmptyString(mac) ,"mac should not be empty !");
       require ( DoctorToPatientAccessPermission [_doctorID] [msg.sender] == false, " An access has already been granted !");
       DoctorToPatientAccessPermission [_doctorID] [msg.sender] = true; // give the doctor access to the patient's medical documents
       patientListOfDoctors[msg.sender].push(_doctorID); // add the doctor to the patient's list of doctors
       doctorListOfPatients[_doctorID].push(msg.sender); // add the patient to the doctor's list of patients
       doctorListOfEnrpytedPassphrases [_doctorID].push(EncryptedPassphrase(msg.sender,iv,ephemPublicKey,ciphertext,mac)); // store the added the encrpyted passphrase on the blockchain
    }
     // Get the number of doctors with access to the medical files of a patient 
    function getDoctorsCount(address _patientID)  view public  userExists(_patientID)  returns (uint) {
       return patientListOfDoctors[_patientID].length;
    }
   // Get the list of doctors with access to the medical files of a patient
    function getPatientListOfDoctors(address _patientID)  view public  userExists(_patientID) returns (address [] memory) {
       return patientListOfDoctors [_patientID];
    }

   // Get the number of patients who have given a specific doctor access to their medical files 
    function getPatientsCount(address _doctorID)  view public  userExists(_doctorID)  returns (uint) {
       return doctorListOfPatients[_doctorID].length;
    }
   // Get the list of patients who have given a specific doctor access to their medical files
    function getDoctorListOfPatients(address _doctorID)  view public  userExists(_doctorID) returns (address [] memory) {
       return doctorListOfPatients[_doctorID];
    }


/****************************************************************************************************************
REVOKING ACCESS
 ****************************************************************************************************************/
 // A patient revokes a doctor's access to his/her medical files.
    function revokeAccessFromDoctor ( address _doctorID )  public userExists(_doctorID)  {
       require ( DoctorToPatientAccessPermission [_doctorID] [msg.sender] == true  , " You cannot revoke a non-existing access" );
       DoctorToPatientAccessPermission [_doctorID] [msg.sender] = false ; // revoke the doctor's access
        
       // Deleting the doctor from the patient's list of doctors.
       address [] storage doctorIds = patientListOfDoctors[msg.sender];
       for (uint i=0; i< doctorIds.length; i++ ){
            if ( doctorIds[i] == _doctorID ){
                  delete patientListOfDoctors[msg.sender][i]; // Equivalent to patientListOfDoctors[msg.sender][i] =0x0000000000000000000000000000000000000000;
            }
         }

      // Deleting the patient from the doctor's list of patients
      address [] storage patientIds= doctorListOfPatients[_doctorID];
      for (uint i=0; i< patientIds.length; i++ ){
            if ( patientIds[i] == msg.sender ){
                delete doctorListOfPatients[_doctorID][i];  // Equivalent to doctorListOfPatients[_doctorID][i] =0x0000000000000000000000000000000000000000;
            }
      }

      // Deleting the patient's ecnrpyted passphrase from the doctor's list of patients' encrpyted passphrases
      EncryptedPassphrase [] storage doctorEncryptedPassphrases = doctorListOfEnrpytedPassphrases[_doctorID];
      for (uint i=0; i< doctorEncryptedPassphrases.length; i++ ){
            if ( doctorEncryptedPassphrases[i].patientAddress == msg.sender ){
                delete doctorListOfEnrpytedPassphrases[_doctorID][i];  // Equivalent to setting the patientAddress element in this struct to 0x0000000000000000000000000000000000000000;
            }
      }



    }

/****************************************************************************************************************
USER REGISTRATION
****************************************************************************************************************/
    // Registering a paitent
    function registerPatient (address _patientID, string memory hash) userExists(_patientID)  public {
      //require (patients[msg.sender].isRegistered == false, " The patient is already registered");
       require (!isEmptyString(hash) ,"hash should not be empty !");
       registeredPatients[_patientID]=true;
         EncryptedPrivateKeyHashes[_patientID]=hash;
    }
   // Determine whether or not the account is a registered patient
    function IsRegisteredPatient (address _ID)  view public returns (bool) {
       return  registeredPatients[_ID] == true ;
    }
  
    // Registering a doctor
    function registerDoctor (address _doctorID, string memory hash) userExists(_doctorID)  public {
      require (!isEmptyString(hash) ,"hash should not be empty !");
       registeredDoctors[_doctorID]=true;
       EncryptedPrivateKeyHashes[_doctorID]=hash;
    }
    // Determine whether or not the account is a registered doctor
    function IsRegisteredDoctor (address _ID)  view public returns (bool) {
       return registeredDoctors[_ID] ==true;
    }

   // return the hash of the user's encrpyted private key
   function getEncryptedPrivateKeyHash(address _userID)  view public  userExists(_userID)  returns (string memory) {
       return EncryptedPrivateKeyHashes[_userID];
    }
    

/****************************************************************************************************************
PASSPHRASES:
****************************************************************************************************************/

    // Get all Encrypted Passphrases for a docotor
    function getListOfEnrpytedPassphrases(address _doctorID)  view public  userExists(_doctorID) returns (EncryptedPassphrase [] memory) {
       return doctorListOfEnrpytedPassphrases[_doctorID];
    }
    
    // Get the number of EncryptedPassphrases sotred on the blockchain for a docotor
    function getEnrpytedPassphrasesCount(address _doctorID)  view public  userExists(_doctorID)  returns (uint) {
       return doctorListOfEnrpytedPassphrases[_doctorID].length;
    }
    

/****************************************************************************************************************
INTERNAL FUNCTIONS
 ****************************************************************************************************************/
   // check if the passed string is empty or not
    function isEmptyString(string memory _str) pure internal returns(bool) {
      bytes memory bytesStr = bytes(_str);
      return bytesStr.length == 0;
    }
/****************************************************************************************************************
MODIFIERS
 ****************************************************************************************************************/
      // Check if the user exits
    modifier userExists(address _userId) {
       // The user could be a patient or a doctor
       require (_userId != address(0x0), 'The user should exist');
       _;
    }
    // Check if the user has access to the requested iformation  
    modifier hasAccess(address _userId_1 ,address _userId_2) {
       require (_userId_1 == _userId_2 , "You do not have access to the requested information");
       _;
    }

}


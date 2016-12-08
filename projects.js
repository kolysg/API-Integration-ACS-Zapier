 create_project_pre_write: function(bundle) {
        var outbound = JSON.parse(bundle.request.data);
        var str = ""; // check
        
    //Company Request
        var customerRequest =  {
            'url': "https://apps7.accountingsuite.com/a/" + bundle.auth_fields.tenant_id + 
                "/odata/standard.odata/Catalog_Companies?$format=json&$filter=Description eq " + "'" + bundle.action_fields.Customer_Key + "'", 
            'headers': {
              "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
            }, 
            "method": "GET"
        };
        var customerResponse = z.request(customerRequest);
        var JSONResponse = JSON.parse(customerResponse.content);
        console.log('customerResponse'+ JSONResponse);
        if (JSONResponse.value.length > 0) {
            outbound.Customer_Key = JSONResponse.value[0].Ref_Key;
            console.log('Customer_Key: ' + JSONResponse.value[0].Ref_Key); 
        }
        else {
            outbound.Customer_Key = "";
        }
        
        if (outbound.Customer_Key === ""){
            str += "The customer you entered doesn't exist. Please check 'AccountingSuite' software to find your company entry, or if needed, please use our 'Create_Company Zap' to create a new customer.";
        } 
        
        //Ref#
        if (outbound.Description === undefined) {
             outbound.Description = '';
        }
        
        //status
        if (outbound.Status === undefined) {
            outbound.Status = '';   
        } 
        
        if (outbound.Type === undefined) {
            outbound.Type = '';
        }
     
        if (str !== ""){
           console.log(str);
           throw new ErrorException(str);
        }
            
        console.log('Description: ' + outbound.Description);
        
        
        //stringify**********************************
        bundle.request.data = JSON.stringify(outbound);
        //console.log(bundle.request.data);
        return bundle.request;  
    },
    
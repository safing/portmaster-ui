<template>
  <div class="menu">
    <!-- Taken from https://dev.maxmind.com/geoip/legacy/codes/iso3166/ -->
    <div class="item" data-value="A1">Anonymous Proxy</div>
    <div class="item" data-value="A2">Satellite Provider</div>
    <!-- <div class="item" data-value="O1">Other Country</div> -->
    <div class="item" data-value="AD">Andorra</div>
    <div class="item" data-value="AE">United Arab Emirates</div>
    <div class="item" data-value="AF">Afghanistan</div>
    <div class="item" data-value="AG">Antigua and Barbuda</div>
    <div class="item" data-value="AI">Anguilla</div>
    <div class="item" data-value="AL">Albania</div>
    <div class="item" data-value="AM">Armenia</div>
    <div class="item" data-value="AO">Angola</div>
    <!-- <div class="item" data-value="AP">Asia/Pacific Region</div> -->
    <div class="item" data-value="AQ">Antarctica</div>
    <div class="item" data-value="AR">Argentina</div>
    <div class="item" data-value="AS">American Samoa</div>
    <div class="item" data-value="AT">Austria</div>
    <div class="item" data-value="AU">Australia</div>
    <div class="item" data-value="AW">Aruba</div>
    <div class="item" data-value="AX">Aland Islands</div>
    <div class="item" data-value="AZ">Azerbaijan</div>
    <div class="item" data-value="BA">Bosnia and Herzegovina</div>
    <div class="item" data-value="BB">Barbados</div>
    <div class="item" data-value="BD">Bangladesh</div>
    <div class="item" data-value="BE">Belgium</div>
    <div class="item" data-value="BF">Burkina Faso</div>
    <div class="item" data-value="BG">Bulgaria</div>
    <div class="item" data-value="BH">Bahrain</div>
    <div class="item" data-value="BI">Burundi</div>
    <div class="item" data-value="BJ">Benin</div>
    <div class="item" data-value="BL">Saint Barthelemy</div>
    <div class="item" data-value="BM">Bermuda</div>
    <div class="item" data-value="BN">Brunei Darussalam</div>
    <div class="item" data-value="BO">Bolivia</div>
    <div class="item" data-value="BQ">Bonaire, Saint Eustatius and Saba</div>
    <div class="item" data-value="BR">Brazil</div>
    <div class="item" data-value="BS">Bahamas</div>
    <div class="item" data-value="BT">Bhutan</div>
    <div class="item" data-value="BV">Bouvet Island</div>
    <div class="item" data-value="BW">Botswana</div>
    <div class="item" data-value="BY">Belarus</div>
    <div class="item" data-value="BZ">Belize</div>
    <div class="item" data-value="CA">Canada</div>
    <div class="item" data-value="CC">Cocos (Keeling) Islands</div>
    <div class="item" data-value="CD">Congo, The Democratic Republic of the</div>
    <div class="item" data-value="CF">Central African Republic</div>
    <div class="item" data-value="CG">Congo</div>
    <div class="item" data-value="CH">Switzerland</div>
    <div class="item" data-value="CI">Cote d'Ivoire</div>
    <div class="item" data-value="CK">Cook Islands</div>
    <div class="item" data-value="CL">Chile</div>
    <div class="item" data-value="CM">Cameroon</div>
    <div class="item" data-value="CN">China</div>
    <div class="item" data-value="CO">Colombia</div>
    <div class="item" data-value="CR">Costa Rica</div>
    <div class="item" data-value="CU">Cuba</div>
    <div class="item" data-value="CV">Cape Verde</div>
    <div class="item" data-value="CW">Curacao</div>
    <div class="item" data-value="CX">Christmas Island</div>
    <div class="item" data-value="CY">Cyprus</div>
    <div class="item" data-value="CZ">Czech Republic</div>
    <div class="item" data-value="DE">Germany</div>
    <div class="item" data-value="DJ">Djibouti</div>
    <div class="item" data-value="DK">Denmark</div>
    <div class="item" data-value="DM">Dominica</div>
    <div class="item" data-value="DO">Dominican Republic</div>
    <div class="item" data-value="DZ">Algeria</div>
    <div class="item" data-value="EC">Ecuador</div>
    <div class="item" data-value="EE">Estonia</div>
    <div class="item" data-value="EG">Egypt</div>
    <div class="item" data-value="EH">Western Sahara</div>
    <div class="item" data-value="ER">Eritrea</div>
    <div class="item" data-value="ES">Spain</div>
    <div class="item" data-value="ET">Ethiopia</div>
    <!-- <div class="item" data-value="EU">Europe</div> -->
    <div class="item" data-value="FI">Finland</div>
    <div class="item" data-value="FJ">Fiji</div>
    <div class="item" data-value="FK">Falkland Islands (Malvinas)</div>
    <div class="item" data-value="FM">Micronesia, Federated States of</div>
    <div class="item" data-value="FO">Faroe Islands</div>
    <div class="item" data-value="FR">France</div>
    <div class="item" data-value="GA">Gabon</div>
    <div class="item" data-value="GB">United Kingdom</div>
    <div class="item" data-value="GD">Grenada</div>
    <div class="item" data-value="GE">Georgia</div>
    <div class="item" data-value="GF">French Guiana</div>
    <div class="item" data-value="GG">Guernsey</div>
    <div class="item" data-value="GH">Ghana</div>
    <div class="item" data-value="GI">Gibraltar</div>
    <div class="item" data-value="GL">Greenland</div>
    <div class="item" data-value="GM">Gambia</div>
    <div class="item" data-value="GN">Guinea</div>
    <div class="item" data-value="GP">Guadeloupe</div>
    <div class="item" data-value="GQ">Equatorial Guinea</div>
    <div class="item" data-value="GR">Greece</div>
    <div class="item" data-value="GS">South Georgia and the South Sandwich Islands</div>
    <div class="item" data-value="GT">Guatemala</div>
    <div class="item" data-value="GU">Guam</div>
    <div class="item" data-value="GW">Guinea-Bissau</div>
    <div class="item" data-value="GY">Guyana</div>
    <div class="item" data-value="HK">Hong Kong</div>
    <div class="item" data-value="HM">Heard Island and McDonald Islands</div>
    <div class="item" data-value="HN">Honduras</div>
    <div class="item" data-value="HR">Croatia</div>
    <div class="item" data-value="HT">Haiti</div>
    <div class="item" data-value="HU">Hungary</div>
    <div class="item" data-value="ID">Indonesia</div>
    <div class="item" data-value="IE">Ireland</div>
    <div class="item" data-value="IL">Israel</div>
    <div class="item" data-value="IM">Isle of Man</div>
    <div class="item" data-value="IN">India</div>
    <div class="item" data-value="IO">British Indian Ocean Territory</div>
    <div class="item" data-value="IQ">Iraq</div>
    <div class="item" data-value="IR">Iran, Islamic Republic of</div>
    <div class="item" data-value="IS">Iceland</div>
    <div class="item" data-value="IT">Italy</div>
    <div class="item" data-value="JE">Jersey</div>
    <div class="item" data-value="JM">Jamaica</div>
    <div class="item" data-value="JO">Jordan</div>
    <div class="item" data-value="JP">Japan</div>
    <div class="item" data-value="KE">Kenya</div>
    <div class="item" data-value="KG">Kyrgyzstan</div>
    <div class="item" data-value="KH">Cambodia</div>
    <div class="item" data-value="KI">Kiribati</div>
    <div class="item" data-value="KM">Comoros</div>
    <div class="item" data-value="KN">Saint Kitts and Nevis</div>
    <div class="item" data-value="KP">Korea, Democratic People's Republic of</div>
    <div class="item" data-value="KR">Korea, Republic of</div>
    <div class="item" data-value="KW">Kuwait</div>
    <div class="item" data-value="KY">Cayman Islands</div>
    <div class="item" data-value="KZ">Kazakhstan</div>
    <div class="item" data-value="LA">Lao People's Democratic Republic</div>
    <div class="item" data-value="LB">Lebanon</div>
    <div class="item" data-value="LC">Saint Lucia</div>
    <div class="item" data-value="LI">Liechtenstein</div>
    <div class="item" data-value="LK">Sri Lanka</div>
    <div class="item" data-value="LR">Liberia</div>
    <div class="item" data-value="LS">Lesotho</div>
    <div class="item" data-value="LT">Lithuania</div>
    <div class="item" data-value="LU">Luxembourg</div>
    <div class="item" data-value="LV">Latvia</div>
    <div class="item" data-value="LY">Libyan Arab Jamahiriya</div>
    <div class="item" data-value="MA">Morocco</div>
    <div class="item" data-value="MC">Monaco</div>
    <div class="item" data-value="MD">Moldova, Republic of</div>
    <div class="item" data-value="ME">Montenegro</div>
    <div class="item" data-value="MF">Saint Martin</div>
    <div class="item" data-value="MG">Madagascar</div>
    <div class="item" data-value="MH">Marshall Islands</div>
    <div class="item" data-value="MK">Macedonia</div>
    <div class="item" data-value="ML">Mali</div>
    <div class="item" data-value="MM">Myanmar</div>
    <div class="item" data-value="MN">Mongolia</div>
    <div class="item" data-value="MO">Macao</div>
    <div class="item" data-value="MP">Northern Mariana Islands</div>
    <div class="item" data-value="MQ">Martinique</div>
    <div class="item" data-value="MR">Mauritania</div>
    <div class="item" data-value="MS">Montserrat</div>
    <div class="item" data-value="MT">Malta</div>
    <div class="item" data-value="MU">Mauritius</div>
    <div class="item" data-value="MV">Maldives</div>
    <div class="item" data-value="MW">Malawi</div>
    <div class="item" data-value="MX">Mexico</div>
    <div class="item" data-value="MY">Malaysia</div>
    <div class="item" data-value="MZ">Mozambique</div>
    <div class="item" data-value="NA">Namibia</div>
    <div class="item" data-value="NC">New Caledonia</div>
    <div class="item" data-value="NE">Niger</div>
    <div class="item" data-value="NF">Norfolk Island</div>
    <div class="item" data-value="NG">Nigeria</div>
    <div class="item" data-value="NI">Nicaragua</div>
    <div class="item" data-value="NL">Netherlands</div>
    <div class="item" data-value="NO">Norway</div>
    <div class="item" data-value="NP">Nepal</div>
    <div class="item" data-value="NR">Nauru</div>
    <div class="item" data-value="NU">Niue</div>
    <div class="item" data-value="NZ">New Zealand</div>
    <div class="item" data-value="OM">Oman</div>
    <div class="item" data-value="PA">Panama</div>
    <div class="item" data-value="PE">Peru</div>
    <div class="item" data-value="PF">French Polynesia</div>
    <div class="item" data-value="PG">Papua New Guinea</div>
    <div class="item" data-value="PH">Philippines</div>
    <div class="item" data-value="PK">Pakistan</div>
    <div class="item" data-value="PL">Poland</div>
    <div class="item" data-value="PM">Saint Pierre and Miquelon</div>
    <div class="item" data-value="PN">Pitcairn</div>
    <div class="item" data-value="PR">Puerto Rico</div>
    <div class="item" data-value="PS">Palestinian Territory</div>
    <div class="item" data-value="PT">Portugal</div>
    <div class="item" data-value="PW">Palau</div>
    <div class="item" data-value="PY">Paraguay</div>
    <div class="item" data-value="QA">Qatar</div>
    <div class="item" data-value="RE">Reunion</div>
    <div class="item" data-value="RO">Romania</div>
    <div class="item" data-value="RS">Serbia</div>
    <div class="item" data-value="RU">Russian Federation</div>
    <div class="item" data-value="RW">Rwanda</div>
    <div class="item" data-value="SA">Saudi Arabia</div>
    <div class="item" data-value="SB">Solomon Islands</div>
    <div class="item" data-value="SC">Seychelles</div>
    <div class="item" data-value="SD">Sudan</div>
    <div class="item" data-value="SE">Sweden</div>
    <div class="item" data-value="SG">Singapore</div>
    <div class="item" data-value="SH">Saint Helena</div>
    <div class="item" data-value="SI">Slovenia</div>
    <div class="item" data-value="SJ">Svalbard and Jan Mayen</div>
    <div class="item" data-value="SK">Slovakia</div>
    <div class="item" data-value="SL">Sierra Leone</div>
    <div class="item" data-value="SM">San Marino</div>
    <div class="item" data-value="SN">Senegal</div>
    <div class="item" data-value="SO">Somalia</div>
    <div class="item" data-value="SR">Suriname</div>
    <div class="item" data-value="SS">South Sudan</div>
    <div class="item" data-value="ST">Sao Tome and Principe</div>
    <div class="item" data-value="SV">El Salvador</div>
    <div class="item" data-value="SX">Sint Maarten</div>
    <div class="item" data-value="SY">Syrian Arab Republic</div>
    <div class="item" data-value="SZ">Swaziland</div>
    <div class="item" data-value="TC">Turks and Caicos Islands</div>
    <div class="item" data-value="TD">Chad</div>
    <div class="item" data-value="TF">French Southern Territories</div>
    <div class="item" data-value="TG">Togo</div>
    <div class="item" data-value="TH">Thailand</div>
    <div class="item" data-value="TJ">Tajikistan</div>
    <div class="item" data-value="TK">Tokelau</div>
    <div class="item" data-value="TL">Timor-Leste</div>
    <div class="item" data-value="TM">Turkmenistan</div>
    <div class="item" data-value="TN">Tunisia</div>
    <div class="item" data-value="TO">Tonga</div>
    <div class="item" data-value="TR">Turkey</div>
    <div class="item" data-value="TT">Trinidad and Tobago</div>
    <div class="item" data-value="TV">Tuvalu</div>
    <div class="item" data-value="TW">Taiwan</div>
    <div class="item" data-value="TZ">Tanzania, United Republic of</div>
    <div class="item" data-value="UA">Ukraine</div>
    <div class="item" data-value="UG">Uganda</div>
    <div class="item" data-value="UM">United States Minor Outlying Islands</div>
    <div class="item" data-value="US">United States</div>
    <div class="item" data-value="UY">Uruguay</div>
    <div class="item" data-value="UZ">Uzbekistan</div>
    <div class="item" data-value="VA">Holy See (Vatican City State)</div>
    <div class="item" data-value="VC">Saint Vincent and the Grenadines</div>
    <div class="item" data-value="VE">Venezuela</div>
    <div class="item" data-value="VG">Virgin Islands, British</div>
    <div class="item" data-value="VI">Virgin Islands, U.S.</div>
    <div class="item" data-value="VN">Vietnam</div>
    <div class="item" data-value="VU">Vanuatu</div>
    <div class="item" data-value="WF">Wallis and Futuna</div>
    <div class="item" data-value="WS">Samoa</div>
    <div class="item" data-value="YE">Yemen</div>
    <div class="item" data-value="YT">Mayotte</div>
    <div class="item" data-value="ZA">South Africa</div>
    <div class="item" data-value="ZM">Zambia</div>
    <div class="item" data-value="ZW">Zimbabwe</div>
  </div>
</template>

<script>
export default {
  name: "CountryList"
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
</style>

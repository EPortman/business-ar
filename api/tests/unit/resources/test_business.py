# Copyright © 2024 Province of British Columbia
#
# Licensed under the BSD 3 Clause License, (the "License");
# you may not use this file except in compliance with the License.
# The template for the license can be found here
#    https://opensource.org/license/bsd-3-clause/
#
# Redistribution and use in source and binary forms,
# with or without modification, are permitted provided that the
# following conditions are met:
#
# 1. Redistributions of source code must retain the above copyright notice,
#    this list of conditions and the following disclaimer.
#
# 2. Redistributions in binary form must reproduce the above copyright notice,
#    this list of conditions and the following disclaimer in the documentation
#    and/or other materials provided with the distribution.
#
# 3. Neither the name of the copyright holder nor the names of its contributors
#    may be used to endorse or promote products derived from this software
#    without specific prior written permission.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS”
# AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
# THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
# ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
# LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
# CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
# SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
# INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
# CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
# ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
# POSSIBILITY OF SUCH DAMAGE.
"""Tests for the business resource.

Test suite to ensure that the Business endpoints are working as expected.
"""
from datetime import datetime
from http import HTTPStatus

from business_ar_api.models import Business, Invitations


def test_business_look_up_by_nano_id(session, client):
    """Assert that a Business can be looked up using the nano id."""
    business = Business(
        legal_name="Test Business 1",
        legal_type="BC",
        identifier="BC1217715",
        tax_id="BN1234567899876",
        nano_id="V1StGXR8_Z5jdHi6B-12T",
    )
    business.save()
    assert business.id is not None

    invitations = Invitations(
        recipients="test@abc.com",
        message="Test Message",
        sent_date=datetime.now(),
        token="abcde123",
        status="SENT",
        additional_message="Test",
        business_id=business.id,
    )
    invitations.save()

    rv = client.get(f"/v1/business/token/{invitations.token}")

    assert rv.status_code == HTTPStatus.OK
    assert rv.json == {
        "legalName": business.legal_name,
        "legalType": business.legal_type,
        "identifier": business.identifier,
        "taxId": business.tax_id,
    }


def test_business_does_not_exist(session, client):
    """Assert that error is returned."""
    business = Business(
        legal_name="Test Business 4",
        legal_type="BC",
        identifier="BC1215715",
        tax_id="BN1234567899876",
        nano_id="V1StGXR8_Z5jdBj7B-12T",
    )
    business.save()
    assert business.id is not None

    rv = client.get(f"/v1/business/token/etc123")

    assert rv.status_code == HTTPStatus.BAD_REQUEST

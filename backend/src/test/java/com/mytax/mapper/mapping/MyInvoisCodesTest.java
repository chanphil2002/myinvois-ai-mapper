package com.mytax.mapper.mapping;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

/** Salvage cases taken from the real 2026-10-15 failures (docs/AI_PARSING_ERRORS.md). */
class MyInvoisCodesTest {

    @Test
    void keepsValidUnitCodes() {
        assertEquals("C62", MyInvoisCodes.salvageUnitCode("C62"));
        assertEquals("KGM", MyInvoisCodes.salvageUnitCode(" kgm "));
    }

    @Test
    void salvagesLeadingCodeFromRamblingValue() {
        assertEquals("C62", MyInvoisCodes.salvageUnitCode("C62Format Code for Unit / One (e.g. standard count item/lot)"));
        assertEquals("C62", MyInvoisCodes.salvageUnitCode("C62巧妙地 matches C62 accurately for retail transaction counting"));
        assertEquals("C62", MyInvoisCodes.salvageUnitCode("C62ScopeCode022131231231231231231231231231"));
        assertEquals("MTK", MyInvoisCodes.salvageUnitCode("MTK square metres of tiles"));
    }

    @Test
    void fallsBackToDefaultUnitAndKeepsBlankAsNull() {
        assertEquals("C62", MyInvoisCodes.salvageUnitCode("pcs"));
        assertNull(MyInvoisCodes.salvageUnitCode("  "));
        assertNull(MyInvoisCodes.salvageUnitCode(null));
    }

    @Test
    void salvagesClassificationCodes() {
        assertEquals("003", MyInvoisCodes.salvageClassificationCode("003"));
        assertEquals("022", MyInvoisCodes.salvageClassificationCode("022 Others because no better match"));
        assertEquals("022", MyInvoisCodes.salvageClassificationCode("999"));
        assertEquals("022", MyInvoisCodes.salvageClassificationCode("Computer"));
    }
}

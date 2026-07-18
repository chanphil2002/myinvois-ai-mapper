package com.mytax.mapper.document;

import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

/**
 * Parses .xlsx rows into plain strings, one list per row, first row assumed to be headers.
 * The AI mapping engine is handed this structure rather than raw bytes so column headers
 * (however messy) are visible to the model as text.
 */
@Component
public class XlsxParser {

    public List<List<String>> parse(byte[] fileBytes) {
        List<List<String>> rows = new ArrayList<>();
        try (InputStream is = new ByteArrayInputStream(fileBytes);
             Workbook workbook = WorkbookFactory.create(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            DataFormatter formatter = new DataFormatter();

            for (Row row : sheet) {
                List<String> cells = new ArrayList<>();
                for (Cell cell : row) {
                    cells.add(formatter.formatCellValue(cell));
                }
                rows.add(cells);
            }
        } catch (IOException e) {
            throw new IllegalStateException("Failed to parse xlsx file", e);
        }
        return rows;
    }
}

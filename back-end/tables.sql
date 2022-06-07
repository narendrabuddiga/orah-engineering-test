#
CREATE TABLE roll(
   	id INT PRIMARY KEY NOT NULL,
   	name VARCHAR(255) NOT NULL,
	completed_at DATE NOT NULL
);

# Students Details 
CREATE TABLE student(
    id INT PRIMARY KEY NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    photo_url VARCHAR(255) NOT NULL
);

#
CREATE TABLE student_roll_state(
   	id INT PRIMARY KEY NOT NULL,
	student_id INT NOT NULL,
	roll_id INT NOT NULL,
	state CHAR(10) NOT NULL
);


#group the students by roll_states("unmark" | "present" | "absent" | "late")
CREATE TABLE group(
   	id INT PRIMARY KEY NOT NULL,
   	name VARCHAR(255) NOT NULL,
	number_of_weeks INTEGER NOT NULL,
	roll_states VARCHAR(255) NOT NULL,
	incidents INTEGER NOT NULL,
	ltmt CHAR NOT NULL,
	run_at DATE,
	student_count INTEGER NOT NULL
);

#student group mapping 
CREATE TABLE student_group(
   	id INT PRIMARY KEY NOT NULL,
	group_id INT NOT NULL,
	student_id INT NOT NULL,
	incident_count INT NOT NULL
);